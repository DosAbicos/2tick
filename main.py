import logging
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.enums import ParseMode
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
API_TOKEN = os.getenv("API_TOKEN")
ADMIN_ID = os.getenv("ADMIN_ID")

bot = Bot(token=API_TOKEN, parse_mode=ParseMode.HTML)
dp = Dispatcher()
logging.basicConfig(level=logging.INFO)

class TaskState(StatesGroup):
    waiting_for_task = State()
    waiting_for_category = State()

async def get_user_id(telegram_id):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/users?telegram_id=eq.{telegram_id}&select=id",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            }
        )
        logging.info(f"SUPABASE RESPONSE: {response.status_code} {response.text}")  # Лог ответа
        data = response.json()
        if data:
            return data[0]["id"]
        return None

async def add_task_to_supabase(task, category, user_id):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/tasks",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            },
            json={"text": task, "status": category, "user_id": user_id}
        )
        return response.status_code == 201

@dp.message(F.text == "/start")
async def start_handler(message: types.Message):
    buttons = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task")],
        [InlineKeyboardButton(text="👀 Просмотр задач", callback_data="view_tasks")]
    ])
    await message.answer("Привет! Я бот Totick 🤖\nВыбери действие:", reply_markup=buttons)

@dp.callback_query(F.data == "add_task")
async def add_task(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.answer("📝 Введите задачу:")
    await state.set_state(TaskState.waiting_for_task)
    await callback.answer()

@dp.message(TaskState.waiting_for_task)
async def process_task(message: types.Message, state: FSMContext):
    await state.update_data(task=message.text)
    buttons = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔥 Сделать немедленно", callback_data="urgent")],
        [InlineKeyboardButton(text="✅ Запланировать", callback_data="planned")],
        [InlineKeyboardButton(text="🔁 Делегировать", callback_data="delegated")],
        [InlineKeyboardButton(text="❌ Удалить", callback_data="deleted")]
    ])
    await message.answer("Выбери категорию задачи:", reply_markup=buttons)
    await state.set_state(TaskState.waiting_for_category)

@dp.callback_query(TaskState.waiting_for_category)
async def process_category(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    task = data["task"]
    category = callback.data
    user_id = await get_user_id(callback.from_user.id)

    if not user_id:
        await callback.message.answer("❌ Ты не зарегистрирован в системе!")
        await state.clear()
        await callback.answer()
        return

    category_names = {
        "urgent": "🔥 Сделать немедленно",
        "planned": "✅ Запланировать",
        "delegated": "🔁 Делегировать",
        "deleted": "❌ Удалить"
    }
    category_name = category_names.get(category, "Неизвестная категория")

    success = await add_task_to_supabase(task, category_name, user_id)
    if success:
        await callback.message.answer(f"✅ Задача добавлена в категорию: {category_name}")
    else:
        await callback.message.answer("❌ Ошибка при добавлении задачи")

    await state.clear()
    await callback.answer()

if __name__ == "__main__":
    dp.run_polling(bot)

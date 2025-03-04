from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
import asyncio
from supabase import create_client
import os

API_TOKEN = os.getenv("API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

bot = Bot(token=API_TOKEN)
dp = Dispatcher()

class TaskState(StatesGroup):
    waiting_for_text = State()
    waiting_for_category = State()

main_keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="➕ Добавить задачу")],
        [KeyboardButton(text="📄 Просмотр задач")]
    ],
    resize_keyboard=True
)

categories_keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="🔥 Срочные"), KeyboardButton(text="✅ Запланированные")],
        [KeyboardButton(text="🔁 Делегированные"), KeyboardButton(text="❌ Удаленные")]
    ],
    resize_keyboard=True
)

@dp.message(Command("start"))
async def start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.username

    response = supabase.table("users").select("*").eq("telegram_id", str(user_id)).execute()
    if not response.data:
        supabase.table("users").insert({
            "telegram_id": str(user_id),
            "username": username
        }).execute()
        await message.answer(f"✅ Регистрация завершена!\nДобро пожаловать, {username}!", reply_markup=main_keyboard)
    else:
        await message.answer("С возвращением! Что сделаем сегодня?", reply_markup=main_keyboard)

@dp.message(F.text == "➕ Добавить задачу")
async def add_task(message: types.Message, state: FSMContext):
    await message.answer("Напиши текст задачи:", reply_markup=ReplyKeyboardRemove())
    await state.set_state(TaskState.waiting_for_text)

@dp.message(TaskState.waiting_for_text)
async def save_task(message: types.Message, state: FSMContext):
    await state.update_data(text=message.text)
    await message.answer("Выбери категорию задачи:", reply_markup=categories_keyboard)
    await state.set_state(TaskState.waiting_for_category)

@dp.message(TaskState.waiting_for_category)
async def select_category(message: types.Message, state: FSMContext):
    data = await state.get_data()
    task_text = data["text"]
    status = message.text

    supabase.table("tasks").insert({
        "telegram_id": str(message.from_user.id),
        "text": task_text,
        "status": status
    }).execute()

    await message.answer("✅ Задача добавлена!", reply_markup=main_keyboard)
    await state.clear()

@dp.message(F.text == "📄 Просмотр задач")
async def view_tasks(message: types.Message):
    response = supabase.table("tasks").select("*").eq("telegram_id", str(message.from_user.id)).execute()
    tasks = response.data
    if tasks:
        text = "\n".join([f"{task['status']} — {task['text']}" for task in tasks])
    else:
        text = "У вас пока нет задач."
    await message.answer(text, reply_markup=main_keyboard)


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())

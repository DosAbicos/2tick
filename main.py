import logging
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.enums import ParseMode
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncpg

API_TOKEN = os.getenv("API_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID"))
DATABASE_URL = os.getenv("SUPABASE_DATABASE_URL")

bot = Bot(token=API_TOKEN, parse_mode=ParseMode.HTML)
dp = Dispatcher()
logging.basicConfig(level=logging.INFO)
scheduler = AsyncIOScheduler()

class TaskStates(StatesGroup):
    waiting_for_task = State()
    waiting_for_category = State()

categories = {
    "🔥 Сделать немедленно": "urgent",
    "✅ Запланировать": "planned",
    "🔁 Делегировать": "delegated",
    "❌ Удалить": "deleted",
}

async def create_db_pool():
    return await asyncpg.create_pool(DATABASE_URL)

db_pool = None

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task")],
        [InlineKeyboardButton(text="📋 Просмотр задач", callback_data="view_tasks")]
    ])
    await message.answer("Привет! Чем займемся сегодня?", reply_markup=keyboard)

@dp.callback_query(F.data == "add_task")
async def add_task(callback: types.CallbackQuery, state: FSMContext):
    await state.set_state(TaskStates.waiting_for_task)
    await callback.message.answer("Введите задачу текстом:")
    await callback.answer()

@dp.message(TaskStates.waiting_for_task)
async def process_task(message: types.Message, state: FSMContext):
    await state.update_data(task=message.text)
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=key, callback_data=f"category:{value}") for key, value in categories.items()]
    ])
    await message.answer("Выберите категорию задачи:", reply_markup=keyboard)
    await state.set_state(TaskStates.waiting_for_category)

@dp.callback_query(F.data.startswith("category:"))
async def process_category(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    task = data.get("task")
    _, category = callback.data.split(":")
    user_id = callback.from_user.id
    username = callback.from_user.username

    async with db_pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO tasks (user_id, username, description, category) VALUES ($1, $2, $3, $4)",
            user_id, username, task, category
        )

    await callback.message.answer(f"✅ Задача добавлена: {task}")
    await state.clear()
    await callback.answer()

@dp.callback_query(F.data == "view_tasks")
async def view_tasks(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT description, category FROM tasks WHERE user_id = $1", user_id)
        if not rows:
            await callback.message.answer("У вас пока нет задач.")
        else:
            tasks = "\n".join([f"{row['description']} — {row['category']}" for row in rows])
            await callback.message.answer(f"Ваши задачи:\n{tasks}")
    await callback.answer()

async def send_reminders():
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT DISTINCT user_id FROM tasks")
        for row in rows:
            user_id = row["user_id"]
            user_tasks = await conn.fetch("SELECT description FROM tasks WHERE user_id = $1", user_id)
            tasks = "\n".join([task["description"] for task in user_tasks])
            if tasks:
                try:
                    await bot.send_message(user_id, f"Напоминание о задачах:\n{tasks}")
                except Exception as e:
                    logging.error(f"Failed to send message to {user_id}: {e}")

async def on_startup():
    global db_pool
    db_pool = await create_db_pool()
    scheduler.add_job(send_reminders, CronTrigger(hour=10))
    scheduler.start()

if __name__ == "__main__":
    import asyncio
    asyncio.run(on_startup())
    dp.run_polling(bot)

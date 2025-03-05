import logging
from aiogram import Bot, Dispatcher, types
from aiogram.enums import ParseMode
from aiogram.filters import Command, CallbackQueryFilter
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncpg
import os

API_TOKEN = os.getenv("API_TOKEN")
ADMIN_ID = os.getenv("ADMIN_ID")
DB_URL = os.getenv("DB_URL")

bot = Bot(token=API_TOKEN, parse_mode=ParseMode.HTML)
dp = Dispatcher()

logging.basicConfig(level=logging.INFO)

scheduler = AsyncIOScheduler()
scheduler.start()

async def create_db_pool():
    return await asyncpg.create_pool(DB_URL)

pool = None

async def add_task(user_id, task, category):
    async with pool.acquire() as conn:
        await conn.execute("INSERT INTO tasks (user_id, task, category) VALUES ($1, $2, $3)", user_id, task, category)

async def get_tasks(user_id):
    async with pool.acquire() as conn:
        return await conn.fetch("SELECT task, category FROM tasks WHERE user_id = $1", user_id)

@dp.message(Command("start"))
async def start_handler(message: types.Message):
    keyboard = InlineKeyboardBuilder()
    keyboard.add(InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task"))
    keyboard.add(InlineKeyboardButton(text="🗒 Просмотр задач", callback_data="view_tasks"))
    await message.answer("Привет! Чем займемся сегодня?", reply_markup=keyboard.as_markup())

@dp.callback_query(CallbackQueryFilter(data="add_task"))
async def process_add_task(callback: types.CallbackQuery):
    await callback.message.answer("Введите задачу текстом:")
    await callback.answer()
    dp.fsm.set_state(callback.from_user.id, "waiting_for_task")

@dp.message(lambda message: dp.fsm.get_state(message.from_user.id) == "waiting_for_task")
async def process_task(message: types.Message):
    await add_task(message.from_user.id, message.text, "Запланированные")
    await message.answer(f"✅ Задача добавлена: {message.text}")
    dp.fsm.finish(message.from_user.id)

@dp.callback_query(CallbackQueryFilter(data="view_tasks"))
async def process_view_tasks(callback: types.CallbackQuery):
    tasks = await get_tasks(callback.from_user.id)
    if tasks:
        task_list = "\n".join([f"{task['task']} — {task['category']}" for task in tasks])
        await callback.message.answer(f"Ваши задачи:\n{task_list}")
    else:
        await callback.message.answer("У вас пока нет задач.")
    await callback.answer()

async def on_startup():
    global pool
    pool = await create_db_pool()
    logging.info("Bot started")

if __name__ == "__main__":
    import asyncio

    asyncio.run(on_startup())
    dp.run_polling(bot)

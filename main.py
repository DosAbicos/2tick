from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
import asyncio
import asyncpg
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import os

TOKEN = os.getenv("API_TOKEN")
ADMIN_ID = os.getenv("ADMIN_ID")
DB_DSN = os.getenv("DATABASE_URL")

bot = Bot(token=TOKEN)
dp = Dispatcher()
scheduler = AsyncIOScheduler()

### FSM ###
class TaskState(StatesGroup):
    waiting_for_task = State()
    waiting_for_category = State()

async def create_db_pool():
    return await asyncpg.create_pool(dsn=DB_DSN)

async def send_reminders():
    pool = await create_db_pool()
    async with pool.acquire() as conn:
        tasks = await conn.fetch("SELECT id, title FROM tasks WHERE reminder_time <= NOW() AND completed = false")
        for task in tasks:
            await bot.send_message(ADMIN_ID, f"🔔 Напоминание: {task['title']}")
            await conn.execute("UPDATE tasks SET completed = true WHERE id = $1", task['id'])

scheduler.add_job(send_reminders, "interval", minutes=1)
scheduler.start()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    builder = InlineKeyboardBuilder()
    builder.add(InlineKeyboardButton(text="Добавить задачу", callback_data="add_task"))
    builder.add(InlineKeyboardButton(text="Просмотр задач", callback_data="view_tasks"))
    await message.answer("Привет! Это Totick!", reply_markup=builder.as_markup())

@dp.callback_query(F.data == "add_task")
async def add_task(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.answer("Введите задачу:")
    await state.set_state(TaskState.waiting_for_task)
    await callback.answer()

@dp.message(TaskState.waiting_for_task)
async def process_task(message: types.Message, state: FSMContext):
    await state.update_data(title=message.text)

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔥 Срочные", callback_data="urgent")],
        [InlineKeyboardButton(text="✅ Запланированные", callback_data="planned")],
        [InlineKeyboardButton(text="🔁 Делегированные", callback_data="delegated")],
        [InlineKeyboardButton(text="❌ Удаленные", callback_data="deleted")]
    ])
    await message.answer("Выберите категорию задачи:", reply_markup=keyboard)
    await state.set_state(TaskState.waiting_for_category)

@dp.callback_query(TaskState.waiting_for_category)
async def process_category(callback: types.CallbackQuery, state: FSMContext):
    user_data = await state.get_data()
    title = user_data['title']
    category = callback.data

    pool = await create_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("INSERT INTO tasks (title, category, completed) VALUES ($1, $2, $3)", title, category, False)

    await callback.message.answer(f"✅ Задача добавлена: {title} [{category}]")
    await state.clear()
    await callback.answer()

@dp.callback_query(F.data == "view_tasks")
async def view_tasks(callback: types.CallbackQuery):
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔥 Срочные", callback_data="urgent")],
        [InlineKeyboardButton(text="✅ Запланированные", callback_data="planned")],
        [InlineKeyboardButton(text="🔁 Делегированные", callback_data="delegated")],
        [InlineKeyboardButton(text="❌ Удаленные", callback_data="deleted")]
    ])
    await callback.message.answer("Выберите категорию задач:", reply_markup=keyboard)
    await callback.answer()

async def main():
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

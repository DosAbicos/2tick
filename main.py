from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command, CallbackQuery
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
import os
from supabase import create_client, Client

API_TOKEN = os.getenv("API_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID"))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

bot = Bot(token=API_TOKEN)
dp = Dispatcher()
scheduler = AsyncIOScheduler()

CATEGORY_BUTTONS = [
    InlineKeyboardButton(text="🔥 Срочные", callback_data="urgent"),
    InlineKeyboardButton(text="✅ Запланированные", callback_data="planned"),
    InlineKeyboardButton(text="🔁 Делегированные", callback_data="delegated"),
    InlineKeyboardButton(text="❌ Удаленные", callback_data="deleted")
]

CATEGORY_KEYBOARD = InlineKeyboardMarkup(inline_keyboard=[CATEGORY_BUTTONS])


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.username
    await register_user(user_id, username)
    buttons = [
        InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task"),
        InlineKeyboardButton(text="📋 Просмотр задач", callback_data="view_tasks")
    ]
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[button] for button in buttons])
    await message.answer("Привет! Я бот для управления задачами. Выбери действие:", reply_markup=keyboard)


async def register_user(user_id, username):
    data, _ = supabase.table("users").select("*").eq("id", user_id).execute()
    if len(data) == 0:
        supabase.table("users").insert({"id": user_id, "username": username}).execute()


@dp.callback_query(CallbackQuery("add_task"))
async def add_task(callback: types.CallbackQuery):
    await callback.message.answer("Введите задачу текстом")


@dp.message()
async def process_task(message: types.Message):
    user_id = message.from_user.id
    task_text = message.text
    buttons = [
        InlineKeyboardButton(text="🔥 Срочные", callback_data=f"category:urgent:{task_text}"),
        InlineKeyboardButton(text="✅ Запланированные", callback_data=f"category:planned:{task_text}"),
        InlineKeyboardButton(text="🔁 Делегированные", callback_data=f"category:delegated:{task_text}"),
        InlineKeyboardButton(text="❌ Удаленные", callback_data=f"category:deleted:{task_text}")
    ]
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[button] for button in buttons])
    await message.answer("Выберите категорию для задачи:", reply_markup=keyboard)


@dp.callback_query(CallbackQuery(lambda c: c.data.startswith("category:")))
async def process_category(callback: types.CallbackQuery):
    _, category, task_text = callback.data.split(":")
    user_id = callback.from_user.id
    supabase.table("tasks").insert({"user_id": user_id, "text": task_text, "category": category}).execute()
    await callback.message.answer(f"Задача добавлена в категорию {category}")
    await callback.answer()


@dp.callback_query(CallbackQuery("view_tasks"))
async def view_tasks(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    data, _ = supabase.table("tasks").select("text", "category").eq("user_id", user_id).execute()
    if len(data) == 0:
        await callback.message.answer("У вас нет задач")
    else:
        tasks = "\n".join([f"{task['category']}: {task['text']}" for task in data])
        await callback.message.answer(f"Ваши задачи:\n{tasks}")
    await callback.answer()


async def send_reminders():
    data, _ = supabase.table("tasks").select("user_id", "text").eq("category", "urgent").execute()
    for task in data:
        user_id = task["user_id"]
        task_text = task["text"]
        await bot.send_message(user_id, f"Напоминание о задаче: {task_text}")


scheduler.add_job(send_reminders, "interval", hours=1)
scheduler.start()

if __name__ == "__main__":
    asyncio.run(dp.start_polling(bot))

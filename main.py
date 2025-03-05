import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.enums import ParseMode
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from datetime import datetime, time
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from supabase import create_client

API_TOKEN = "{API_TOKEN}"
ADMIN_ID = {ADMIN_ID}
SUPABASE_URL = "{SUPABASE_URL}"
SUPABASE_KEY = "{SUPABASE_KEY}"

bot = Bot(token=API_TOKEN, parse_mode=ParseMode.HTML)
dp = Dispatcher()
scheduler = AsyncIOScheduler()
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

logging.basicConfig(level=logging.INFO)

async def cmd_start(message: types.Message):
    telegram_id = message.from_user.id
    username = message.from_user.username

    response = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute()
    if len(response.data) == 0:
        supabase.table("users").insert({"telegram_id": telegram_id, "username": username}).execute()

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task")],
        [InlineKeyboardButton(text="📋 Просмотреть задачи", callback_data="view_tasks")]
    ])
    await message.answer("Привет! Чем могу помочь?", reply_markup=keyboard)

@dp.callback_query(lambda c: c.data == "add_task")
async def add_task(callback: types.CallbackQuery):
    await callback.message.answer("Введите текст задачи:")
    dp.message.register(process_task)

async def process_task(message: types.Message):
    telegram_id = message.from_user.id
    text = message.text
    user = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute().data[0]
    user_id = user["id"]

    supabase.table("tasks").insert({"user_id": user_id, "text": text, "status": "Запланированные"}).execute()
    await message.answer("✅ Задача добавлена")

@dp.callback_query(lambda c: c.data == "view_tasks")
async def view_tasks(callback: types.CallbackQuery):
    telegram_id = callback.from_user.id
    user = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute().data[0]
    user_id = user["id"]

    tasks = supabase.table("tasks").select("text", "status").eq("user_id", user_id).execute().data
    if not tasks:
        await callback.message.answer("У вас нет задач")
    else:
        text = "📋 Ваши задачи:\n"
        for task in tasks:
            text += f"- {task['text']} ({task['status']})\n"
        await callback.message.answer(text)

async def send_reminders():
    users = supabase.table("users").select("telegram_id").execute().data
    for user in users:
        telegram_id = user["telegram_id"]
        await bot.send_message(chat_id=telegram_id, text="🔔 Не забудьте проверить свои задачи!")

async def main():
    dp.include_router(dp.message.register(cmd_start, Command("start")))
    scheduler.add_job(send_reminders, 'cron', hour=10, minute=0)
    scheduler.start()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

import os
import asyncio
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from supabase import create_client
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler

API_TOKEN = os.getenv("API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

bot = Bot(token=API_TOKEN)
dp = Dispatcher()
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
scheduler = AsyncIOScheduler()

logging.basicConfig(level=logging.INFO)


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.username

    response = supabase.table("users").select("*").eq("telegram_id", user_id).execute()

    if len(response.data) == 0:
        supabase.table("users").insert({
            "telegram_id": user_id,
            "username": username
        }).execute()

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task")],
        [InlineKeyboardButton(text="📋 Просмотр задач", callback_data="view_tasks")]
    ])

    await message.answer("Привет! Чем займемся сегодня?", reply_markup=keyboard)


@dp.callback_query(F.data == "add_task")
async def add_task_callback(callback: types.CallbackQuery):
    await callback.message.answer("Введите задачу текстом:")
    await callback.answer()


@dp.message()
async def process_task(message: types.Message):
    user_id = message.from_user.id
    text = message.text

    user = supabase.table("users").select("id").eq("telegram_id", user_id).execute()
    if len(user.data) > 0:
        user_uuid = user.data[0]["id"]
        supabase.table("tasks").insert({
            "user_id": user_uuid,
            "text": text,
            "status": "Запланированные",
            "created_at": datetime.now().isoformat()
        }).execute()

        await message.answer(f"✅ Задача добавлена: {text}")


@dp.callback_query(F.data == "view_tasks")
async def view_tasks(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    user = supabase.table("users").select("id").eq("telegram_id", user_id).execute()
    if len(user.data) > 0:
        user_uuid = user.data[0]["id"]
        tasks = supabase.table("tasks").select("*").eq("user_id", user_uuid).execute()
        if len(tasks.data) > 0:
            text = "Ваши задачи:\n\n"
            for task in tasks.data:
                text += f"{task['text']} — {task['status']}\n"
            await callback.message.answer(text)
        else:
            await callback.message.answer("У вас пока нет задач")
    await callback.answer()


async def send_reminders():
    users = supabase.table("users").select("telegram_id").execute()
    for user in users.data:
        await bot.send_message(user["telegram_id"], "🌅 Доброе утро! Не забудьте проверить свои задачи на сегодня!")


async def main():
    scheduler.add_job(send_reminders, "cron", hour=22, minute=30)
    scheduler.start()

    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())

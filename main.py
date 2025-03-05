import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
from supabase import create_client, Client
import asyncio
import os

API_TOKEN = os.getenv("API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

bot = Bot(token=API_TOKEN)
dp = Dispatcher()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Логгер
logging.basicConfig(level=logging.INFO)

def get_or_create_user(telegram_id):
    response = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute()
    if response.data:
        return response.data[0]["id"]
    else:
        user = supabase.table("users").insert({"telegram_id": telegram_id}).execute()
        return user.data[0]["id"]

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    telegram_id = message.from_user.id
    get_or_create_user(telegram_id)
    builder = InlineKeyboardBuilder()
    builder.button(text="Добавить задачу", callback_data="add_task")
    builder.button(text="Просмотр задач", callback_data="view_tasks")
    builder.adjust(1)
    await message.answer("Привет! Что хотите сделать?", reply_markup=builder.as_markup())

@dp.callback_query(lambda c: c.data == "add_task")
async def add_task(callback: types.CallbackQuery):
    await callback.message.answer("Введите текст задачи")
    await bot.answer_callback_query(callback.id)
    dp.message.register(process_task_text)

async def process_task_text(message: types.Message):
    telegram_id = message.from_user.id
    user_id = get_or_create_user(telegram_id)
    task_text = message.text
    supabase.table("tasks").insert({
        "user_id": user_id,
        "text": task_text,
        "category": "🔥 Срочные",
        "status": "new"
    }).execute()
    await message.answer("✅ Задача добавлена")
    dp.message.unregister(process_task_text)

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

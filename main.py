from supabase import create_client, Client
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
API_TOKEN = os.getenv("API_TOKEN")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    telegram_id = message.from_user.id
    user = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute()

    if len(user.data) == 0:
        new_user = supabase.table("users").insert({"telegram_id": telegram_id}).execute()
        user_id = new_user.data[0]["id"]
    else:
        user_id = user.data[0]["id"]

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task")],
        [InlineKeyboardButton(text="📄 Просмотр задач", callback_data="view_tasks")]
    ])
    await message.answer("👋 Привет! Выбери действие:", reply_markup=keyboard)

@dp.callback_query(lambda c: c.data == "add_task")
async def add_task(callback_query: types.CallbackQuery):
    await callback_query.message.answer("Напиши текст задачи:")
    dp.message.register(waiting_task)

async def waiting_task(message: types.Message):
    telegram_id = message.from_user.id
    task_text = message.text

    user = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute()
    if len(user.data) == 0:
        await message.answer("❌ Ты не зарегистрирован")
        return

    user_id = user.data[0]["id"]

    supabase.table("tasks").insert({
        "user_id": user_id,
        "text": task_text,
        "status": "new"
    }).execute()

    await message.answer("✅ Задача добавлена!")

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from supabase import create_client
import asyncio
import os

BOT_TOKEN = os.getenv("API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    telegram_id = message.from_user.id
    username = message.from_user.username
    response = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute()
    if len(response.data) == 0:
        supabase.table("users").insert({
            "telegram_id": telegram_id,
            "username": username
        }).execute()
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task")],
            [InlineKeyboardButton(text="📄 Просмотр задач", callback_data="view_tasks")]
        ]
    )
    await message.answer("Добро пожаловать в Totick!", reply_markup=keyboard)

@dp.callback_query(lambda c: c.data == "add_task")
async def add_task(callback: types.CallbackQuery):
    await callback.message.answer("Введите задачу:")
    dp.message.register(wait_for_task)

async def wait_for_task(message: types.Message):
    telegram_id = message.from_user.id
    response = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute()
    if len(response.data) > 0:
        user_id = response.data[0]["id"]
        supabase.table("tasks").insert({
            "user_id": user_id,
            "text": message.text,
            "status": "🔄 В процессе"
        }).execute()
        await message.answer("Задача добавлена!")
    else:
        await message.answer("Вы не зарегистрированы.")

@dp.callback_query(lambda c: c.data == "view_tasks")
async def view_tasks(callback: types.CallbackQuery):
    telegram_id = callback.from_user.id
    response = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute()
    if len(response.data) > 0:
        user_id = response.data[0]["id"]
        tasks = supabase.table("tasks").select("text", "status").eq("user_id", user_id).execute().data
        if len(tasks) == 0:
            await callback.message.answer("У вас нет задач.")
        else:
            tasks_list = "\n".join([f"{task['text']} - {task['status']}" for task in tasks])
            await callback.message.answer(f"Ваши задачи:\n{tasks_list}")
    else:
        await callback.message.answer("Вы не зарегистрированы.")

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

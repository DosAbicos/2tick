from aiogram import Bot, Dispatcher, types
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.filters import Command
import asyncio
from supabase import create_client
import os

API_TOKEN = os.getenv("API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

bot = Bot(token=API_TOKEN)
dp = Dispatcher()

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

# Регистрация пользователя
@dp.message(Command("start"))
async def start(message: types.Message):
    user_id = message.from_user.id
    username = message.from_user.username

    # Проверяем есть ли уже пользователь
    response = supabase.table("users").select("*").eq("telegram_id", str(user_id)).execute()
    if not response.data:
        supabase.table("users").insert({
            "telegram_id": str(user_id),
            "username": username
        }).execute()
        await message.answer(f"✅ Регистрация завершена!\nДобро пожаловать, {username}!", reply_markup=main_keyboard)
    else:
        await message.answer("С возвращением! Что сделаем сегодня?", reply_markup=main_keyboard)

# Добавление задачи
@dp.message(lambda message: message.text == "➕ Добавить задачу")
async def add_task(message: types.Message):
    await message.answer("Напиши текст задачи:")
    dp.message.register(save_task)

async def save_task(message: types.Message):
    task_text = message.text
    await message.answer("Выбери категорию задачи:", reply_markup=categories_keyboard)
    dp.message.register(select_category, state=task_text)

async def select_category(message: types.Message, state):
    status = message.text
    task_text = state
    supabase.table("tasks").insert({
        "user_id": str(message.from_user.id),
        "text": task_text,
        "status": status
    }).execute()

    await message.answer("✅ Задача добавлена!", reply_markup=main_keyboard)

# Просмотр задач
@dp.message(lambda message: message.text == "📄 Просмотр задач")
async def view_tasks(message: types.Message):
    response = supabase.table("tasks").select("*").eq("user_id", str(message.from_user.id)).execute()
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

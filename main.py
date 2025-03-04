from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
import asyncio
import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
API_TOKEN = os.getenv("API_TOKEN")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

bot = Bot(token=API_TOKEN)
dp = Dispatcher()

# Кнопки меню
main_keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)
main_keyboard.add("➕ Добавить задачу", "📄 Просмотр задач")

category_keyboard = types.ReplyKeyboardMarkup(resize_keyboard=True)
category_keyboard.add("🔥 Срочные", "✅ Запланированные")
category_keyboard.add("🔁 Делегированные", "❌ Удаленные")

@dp.message(Command("start"))
async def start(message: types.Message):
    await message.answer("Привет! Я бот для управления задачами. Выберите действие:", reply_markup=main_keyboard)

@dp.message(lambda message: message.text == "➕ Добавить задачу")
async def add_task(message: types.Message):
    await message.answer("Введите текст задачи:")

    @dp.message()
    async def task_text(message: types.Message):
        global task_text_global
        task_text_global = message.text
        await message.answer("Выберите категорию задачи:", reply_markup=category_keyboard)

@dp.message(lambda message: message.text in ["🔥 Срочные", "✅ Запланированные", "🔁 Делегированные", "❌ Удаленные"])
async def category(message: types.Message):
    category_dict = {
        "🔥 Срочные": "🔥",
        "✅ Запланированные": "✅",
        "🔁 Делегированные": "🔁",
        "❌ Удаленные": "❌"
    }
    status = category_dict[message.text]
    supabase.table("tasks").insert({
        "user_id": str(message.from_user.id),
        "text": task_text_global,
        "status": status
    }).execute()
    await message.answer("✅ Задача добавлена!", reply_markup=main_keyboard)

@dp.message(lambda message: message.text == "📄 Просмотр задач")
async def view_tasks(message: types.Message):
    response = supabase.table("tasks").select("text", "status").eq("user_id", str(message.from_user.id)).execute()
    tasks = response.data
    if not tasks:
        await message.answer("У вас нет задач.")
    else:
        task_list = "\n".join([f"{task['status']} {task['text']}" for task in tasks])
        await message.answer(f"Ваши задачи:\n{task_list}")

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

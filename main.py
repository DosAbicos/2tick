from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
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

# Кнопки
add_task_button = InlineKeyboardMarkup(
    inline_keyboard=[[InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task")],
                     [InlineKeyboardButton(text="👀 Просмотр задач", callback_data="view_tasks")]]
)

@dp.message(Command("start"))
async def start(message: types.Message):
    await message.answer("Привет! Я бот для управления задачами. Выберите действие:", reply_markup=add_task_button)

@dp.callback_query(lambda c: c.data == "add_task")
async def add_task(callback_query: types.CallbackQuery):
    await callback_query.message.answer("Введите текст задачи:")
    await bot.answer_callback_query(callback_query.id)

    @dp.message()
    async def task_text(message: types.Message):
        global task_text
        task_text = message.text
        category_buttons = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="🔥 Срочные", callback_data="🔥"),
                 InlineKeyboardButton(text="✅ Запланированные", callback_data="✅")],
                [InlineKeyboardButton(text="🔁 Делегированные", callback_data="🔁"),
                 InlineKeyboardButton(text="❌ Удаленные", callback_data="❌")]
            ]
        )
        await message.answer(f"Вы ввели задачу: {task_text}\nВыберите категорию:", reply_markup=category_buttons)

@dp.callback_query(lambda c: c.data in ["🔥", "✅", "🔁", "❌"])
async def category(callback_query: types.CallbackQuery):
    status = callback_query.data
    user_id = callback_query.from_user.id
    await callback_query.message.answer(f"✅ Задача добавлена в категорию {status}!")
    await bot.answer_callback_query(callback_query.id)
    supabase.table("tasks").insert({
        "user_id": str(user_id),
        "text": task_text,
        "status": status
    }).execute()

@dp.callback_query(lambda c: c.data == "view_tasks")
async def view_tasks(callback_query: types.CallbackQuery):
    user_id = str(callback_query.from_user.id)
    data = supabase.table("tasks").select("text, status").eq("user_id", user_id).execute()
    tasks = data.data

    if tasks:
        tasks_text = "\n".join([f"{task['status']} {task['text']}" for task in tasks])
        await callback_query.message.answer(f"Ваши задачи:\n{tasks_text}")
    else:
        await callback_query.message.answer("У вас пока нет задач.")

    await bot.answer_callback_query(callback_query.id)

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

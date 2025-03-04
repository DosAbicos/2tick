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

# Кнопки главного меню
main_menu = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task")],
        [InlineKeyboardButton(text="📄 Просмотр задач", callback_data="view_tasks")]
    ]
)

category_buttons = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="🔥 Срочные", callback_data="category_urgent")],
        [InlineKeyboardButton(text="✅ Запланированные", callback_data="category_planned")],
        [InlineKeyboardButton(text="🔁 Делегированные", callback_data="category_delegated")],
        [InlineKeyboardButton(text="❌ Удаленные", callback_data="category_deleted")]
    ]
)

@dp.message(Command("start"))
async def start(message: types.Message):
    await message.answer("Привет! Я бот для управления задачами. Выберите действие:", reply_markup=main_menu)

@dp.callback_query(lambda c: c.data == "add_task")
async def add_task(callback_query: types.CallbackQuery):
    await callback_query.message.answer("Введите текст задачи:")
    await bot.answer_callback_query(callback_query.id)

    @dp.message()
    async def task_text(message: types.Message):
        task_text = message.text
        await message.answer("Выберите категорию задачи:", reply_markup=category_buttons)

        @dp.callback_query(lambda c: c.data.startswith("category_"))
        async def category(callback_query: types.CallbackQuery):
            category = callback_query.data.split("_")[1]
            category_map = {
                "urgent": "🔥",
                "planned": "✅",
                "delegated": "🔁",
                "deleted": "❌"
            }
            status = category_map[category]
            supabase.table("tasks").insert({"user_id": message.from_user.id, "text": task_text, "status": status}).execute()
            await callback_query.message.answer(f"✅ Задача добавлена в категорию {status}!")
            await bot.answer_callback_query(callback_query.id)

@dp.callback_query(lambda c: c.data == "view_tasks")
async def view_tasks(callback_query: types.CallbackQuery):
    response = supabase.table("tasks").select("text, status").execute()
    tasks = response.data
    if not tasks:
        await callback_query.message.answer("У вас пока нет задач.")
    else:
        tasks_text = "\n".join([f"{task['status']} {task['text']}" for task in tasks])
        await callback_query.message.answer(f"Ваши задачи:\n{tasks_text}")
    await bot.answer_callback_query(callback_query.id)

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

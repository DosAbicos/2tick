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

# Кнопка добавления задачи
add_task_button = InlineKeyboardMarkup(
    inline_keyboard=[[InlineKeyboardButton(text="➕ Добавить задачу", callback_data="add_task")]]
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
        task_text = message.text
        confirm_buttons = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="✅ Подтвердить", callback_data="confirm_task"),
                 InlineKeyboardButton(text="❌ Отменить", callback_data="cancel_task")]
            ]
        )
        await message.answer(f"Вы ввели задачу: {task_text}", reply_markup=confirm_buttons)

        @dp.callback_query(lambda c: c.data == "confirm_task")
        async def confirm(callback_query: types.CallbackQuery):
            supabase.table("tasks").insert({"user_id": message.from_user.id, "text": task_text, "status": "🔥"}).execute()
            await callback_query.message.answer("✅ Задача добавлена!")
            await bot.answer_callback_query(callback_query.id)

        @dp.callback_query(lambda c: c.data == "cancel_task")
        async def cancel(callback_query: types.CallbackQuery):
            await callback_query.message.answer("❌ Задача отменена.")
            await bot.answer_callback_query(callback_query.id)

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

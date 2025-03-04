import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from supabase import create_client

TOKEN = os.getenv("API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

bot = Bot(token=TOKEN)
dp = Dispatcher()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

main_keyboard = ReplyKeyboardMarkup(keyboard=[
    [KeyboardButton(text="➕ Добавить задачу")],
    [KeyboardButton(text="📋 Просмотр задач")]
], resize_keyboard=True)

category_keyboard = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="🔥 Срочные", callback_data="urgent")],
    [InlineKeyboardButton(text="✅ Запланированные", callback_data="planned")],
    [InlineKeyboardButton(text="🔁 Делегированные", callback_data="delegated")],
    [InlineKeyboardButton(text="❌ Удаленные", callback_data="deleted")]
])

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    telegram_id = message.from_user.id
    user = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute()

    if len(user.data) == 0:
        supabase.table("users").insert({
            "telegram_id": telegram_id,
            "username": message.from_user.username
        }).execute()
        await message.answer("Ты зарегистрирован! 🔥 Теперь можешь добавлять задачи", reply_markup=main_keyboard)
    else:
        await message.answer("С возвращением! Чем займемся сегодня?", reply_markup=main_keyboard)

@dp.message()
async def add_task(message: types.Message):
    if message.text == "➕ Добавить задачу":
        await message.answer("Напиши текст задачи")
        return

    telegram_id = message.from_user.id
    user = supabase.table("users").select("id").eq("telegram_id", telegram_id).execute()

    if len(user.data) > 0:
        user_id = user.data[0]["id"]
        task_text = message.text
        await message.answer("Выбери категорию задачи", reply_markup=category_keyboard)

        @dp.callback_query()
        async def choose_category(callback: types.CallbackQuery):
            category = callback.data
            supabase.table("tasks").insert({
                "user_id": user_id,
                "text": task_text,
                "category": category,
                "status": "new"
            }).execute()
            await callback.message.answer("Задача добавлена ✅")
            await callback.answer()
    else:
        await message.answer("Ты еще не зарегистрирован, нажми /start чтобы зарегистрироваться")

if __name__ == "__main__":
    import asyncio
    asyncio.run(dp.start_polling(bot))

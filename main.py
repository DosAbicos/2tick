import asyncio
import logging
import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
from supabase import create_client
from datetime import datetime, time

# Настройки
API_TOKEN = os.getenv("API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
ADMIN_ID = int(os.getenv("ADMIN_ID"))

# Инициализация
bot = Bot(token=API_TOKEN)
dp = Dispatcher()
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
logging.basicConfig(level=logging.INFO)

# Статусы задач
STATUSES = {"🔥 Срочные": "urgent", "✅ Запланированные": "planned", "🔁 Делегированные": "delegated", "❌ Удаленные": "deleted"}

# Команда /start
async def cmd_start(message: types.Message):
    user = supabase.table("users").select("id").eq("telegram_id", message.from_user.id).execute()
    if not user.data:
        supabase.table("users").insert({"telegram_id": message.from_user.id, "username": message.from_user.username}).execute()
        await message.answer("Привет! Ты зарегистрирован в Totick 🎯")
    else:
        await message.answer("С возвращением в Totick! 🎯")

# Кнопки для выбора статуса
def get_status_keyboard():
    builder = InlineKeyboardBuilder()
    for text, status in STATUSES.items():
        builder.button(text=text, callback_data=f"status:{status}")
    return builder.as_markup()

# Добавление задачи
@dp.message(Command("add"))
async def add_task(message: types.Message):
    await message.answer("Напиши задачу")
    dp.message.register(process_task)

async def process_task(message: types.Message):
    keyboard = get_status_keyboard()
    state = dp.current_state(user=message.from_user.id)
    await state.update_data(text=message.text)
    await message.answer("Выбери категорию задачи:", reply_markup=keyboard)

@dp.callback_query(lambda c: c.data.startswith("status:"))
async def select_status(callback: types.CallbackQuery):
    status = callback.data.split(":")[1]
    state = dp.current_state(user=callback.from_user.id)
    data = await state.get_data()

    task = {
        "user_id": supabase.table("users").select("id").eq("telegram_id", callback.from_user.id).execute().data[0]["id"],
        "text": data["text"],
        "status": status,
        "created_at": datetime.utcnow().isoformat()
    }
    supabase.table("tasks").insert(task).execute()
    await callback.message.answer(f"✅ Задача добавлена в категорию: {status}")
    await callback.answer()

# Просмотр задач
@dp.message(Command("tasks"))
async def view_tasks(message: types.Message):
    user = supabase.table("users").select("id").eq("telegram_id", message.from_user.id).execute().data[0]
    tasks = supabase.table("tasks").select("text", "status").eq("user_id", user["id"]).execute().data
    if tasks:
        text = "\n".join([f"{t['text']} ({t['status']})" for t in tasks])
    else:
        text = "Задач нет"
    await message.answer(text)

# Напоминания в 10:00
async def daily_reminder():
    while True:
        now = datetime.now().time()
        target_time = time(10, 0)
        if now.hour == target_time.hour and now.minute == target_time.minute:
            users = supabase.table("users").select("telegram_id").execute().data
            for user in users:
                await bot.send_message(user["telegram_id"], "🔥 Проверь свои срочные задачи!")
        await asyncio.sleep(60)

async def main():
    dp.message.register(cmd_start, Command("start"))
    dp.message.register(add_task, Command("add"))
    dp.message.register(view_tasks, Command("tasks"))
    asyncio.create_task(daily_reminder())
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

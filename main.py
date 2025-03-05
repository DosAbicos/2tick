from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
import asyncio
import logging
import os
from supabase import create_client, Client
from datetime import datetime, timedelta

API_TOKEN = os.getenv("API_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID"))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

logging.basicConfig(level=logging.INFO)

STATUS_BUTTONS = {
    "🔥 Срочные": "urgent",
    "✅ Запланированные": "planned",
    "🔁 Делегированные": "delegated",
    "❌ Удаленные": "deleted",
}

async def send_reminders():
    while True:
        now = datetime.now()
        if now.hour == 10 and now.minute == 0:
            response = supabase.table("tasks").select("text", "status", "user_id").eq("status", "urgent").execute()
            if response.data:
                for task in response.data:
                    user_id = task["user_id"]
                    text = task["text"]
                    await bot.send_message(user_id, f"🔔 Напоминание: {text}")
        await asyncio.sleep(60)

async def cmd_start(message: types.Message):
    telegram_id = message.from_user.id
    user = supabase.table("users").select("id").eq("telegram_id", telegram_id).single().execute()

    if not user.data:
        new_user = supabase.table("users").insert({"telegram_id": telegram_id, "username": message.from_user.username}).execute()
        await message.answer("Добро пожаловать в Totick! 👋")
    else:
        await message.answer("С возвращением в Totick!")

    builder = InlineKeyboardBuilder()
    builder.button(text="Добавить задачу", callback_data="add_task")
    builder.button(text="Просмотр задач", callback_data="view_tasks")
    await message.answer("Выберите действие:", reply_markup=builder.as_markup())

@dp.callback_query(lambda c: c.data == "view_tasks")
async def view_tasks(callback: types.CallbackQuery):
    telegram_id = callback.from_user.id
    user = supabase.table("users").select("id").eq("telegram_id", telegram_id).single().execute()

    if user.data:
        user_id = user.data["id"]
        response = supabase.table("tasks").select("text", "status", "id").eq("user_id", user_id).execute()

        if response.data:
            for task in response.data:
                text = task["text"]
                status = task["status"]
                task_id = task["id"]
                builder = InlineKeyboardBuilder()
                for name, value in STATUS_BUTTONS.items():
                    builder.button(text=name, callback_data=f"change_status:{task_id}:{value}")
                await callback.message.answer(f"📌 {text} [{status}]", reply_markup=builder.as_markup())
        else:
            await callback.message.answer("Нет задач 😌")

@dp.callback_query(lambda c: c.data.startswith("change_status"))
async def change_status(callback: types.CallbackQuery):
    _, task_id, new_status = callback.data.split(":")
    supabase.table("tasks").update({"status": new_status}).eq("id", task_id).execute()
    await callback.message.answer(f"✅ Статус задачи изменен на {new_status}")
    await callback.answer()

async def main():
    loop = asyncio.get_event_loop()
    loop.create_task(send_reminders())
    dp.include_router(dp.message.register(cmd_start, Command("start")))
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

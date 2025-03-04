import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import Message
from supabase import create_client
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
API_TOKEN = os.getenv("API_TOKEN")

# Подключение к Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Инициализация бота
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

async def register_user(telegram_id, username):
    user_exists = supabase.table("users").select("telegram_id").eq("telegram_id", telegram_id).execute()
    if len(user_exists.data) == 0:
        data = {
            "telegram_id": telegram_id,
            "username": username
        }
        supabase.table("users").insert(data).execute()
        return True
    return False

async def create_task(user_id, text, status):
    data = {
        "user_id": user_id,
        "text": text,
        "status": status
    }
    response = supabase.table("tasks").insert(data).execute()
    return response

@dp.message(CommandStart())
async def start_handler(message: Message):
    registered = await register_user(message.from_user.id, message.from_user.username)
    if registered:
        await message.answer("Вы успешно зарегистрированы в системе Totick! ✅")
    else:
        await message.answer("Вы уже зарегистрированы!")

@dp.message()
async def handle_task(message: Message):
    user = supabase.table("users").select("id").eq("telegram_id", message.from_user.id).execute()
    if len(user.data) == 0:
        await message.answer("Сначала нужно зарегистрироваться через команду /start")
        return

    user_id = user.data[0]["id"]
    text = message.text
    status = "✅ Запланировать"

    await create_task(user_id, text, status)
    await message.answer(f"Задача добавлена: {text}")

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

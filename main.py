from aiogram import Bot, Dispatcher, types
from aiogram.types import Message
import asyncio
import os

API_TOKEN = os.getenv("API_TOKEN")

bot = Bot(token=API_TOKEN)
dp = Dispatcher()

@dp.message(commands=["start"])
async def start(message: Message):
    await message.answer("Привет, я Totick 🤖")

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

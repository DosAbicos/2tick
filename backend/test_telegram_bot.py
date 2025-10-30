import os
from telegram import Bot
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def test_bot():
    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not token:
        print("❌ TELEGRAM_BOT_TOKEN не найден в .env")
        return
    
    bot = Bot(token)
    
    try:
        me = await bot.get_me()
        print(f"✅ Бот работает!")
        print(f"   Имя: {me.first_name}")
        print(f"   Username: @{me.username}")
        print(f"   ID: {me.id}")
        print(f"\n📱 Для тестирования:")
        print(f"   1. Откройте Telegram")
        print(f"   2. Найдите бота: @{me.username}")
        print(f"   3. Отправьте команду: /start")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    asyncio.run(test_bot())

import os
from telegram import Bot
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def check_webhook():
    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    bot = Bot(token)
    
    webhook_info = await bot.get_webhook_info()
    print(f"Webhook URL: {webhook_info.url or 'Не установлен (polling режим)'}")
    print(f"Pending updates: {webhook_info.pending_update_count}")
    
    if webhook_info.url:
        print("\n⚠️  Обнаружен webhook! Удаляем...")
        await bot.delete_webhook(drop_pending_updates=True)
        print("✅ Webhook удален")

if __name__ == "__main__":
    asyncio.run(check_webhook())

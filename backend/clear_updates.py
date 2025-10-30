import os
from telegram import Bot
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def clear_updates():
    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    bot = Bot(token)
    
    print("Очистка pending updates...")
    updates = await bot.get_updates(offset=-1, timeout=1)
    if updates:
        last_update_id = updates[-1].update_id
        await bot.get_updates(offset=last_update_id + 1, timeout=1)
        print(f"✅ Очищено {len(updates)} updates")
    else:
        print("✅ Нет pending updates")
    
    # Удаляем webhook на всякий случай
    await bot.delete_webhook(drop_pending_updates=True)
    print("✅ Webhook удален и все updates очищены")

if __name__ == "__main__":
    asyncio.run(clear_updates())

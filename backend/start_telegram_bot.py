#!/usr/bin/env python3
"""
Telegram Bot для Signify KZ - запуск
Этот бот отвечает на /start и готов принимать сообщения для OTP
"""

import asyncio
from telegram import Bot, Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import os
import json
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
CHAT_IDS_FILE = '/tmp/telegram_chat_ids.json'

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

def load_chat_ids():
    """Load chat IDs from file"""
    try:
        if os.path.exists(CHAT_IDS_FILE):
            with open(CHAT_IDS_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return {}

def save_chat_ids(chat_ids):
    """Save chat IDs to file"""
    try:
        with open(CHAT_IDS_FILE, 'w') as f:
            json.dump(chat_ids, f)
    except Exception as e:
        print(f"Error saving chat IDs: {e}")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start with deep link support"""
    username = update.effective_user.username
    chat_id = update.effective_chat.id
    
    # Save chat ID
    if username:
        chat_ids = load_chat_ids()
        chat_ids[username] = chat_id
        save_chat_ids(chat_ids)
        print(f"✅ User {username} started bot, chat_id: {chat_id}")
    
    # Check if this is a deep link with contract_id
    if context.args and len(context.args) > 0:
        contract_id = context.args[0]
        print(f"🔗 Deep link detected: contract_id={contract_id}")
        
        # Find the OTP for this contract
        try:
            verification = await db.verifications.find_one({
                "contract_id": contract_id,
                "method": "telegram",
                "verified": False
            }, sort=[("created_at", -1)])
            
            if verification:
                otp_code = verification['otp_code']
                
                await update.message.reply_text(
                    f"🔐 *Signify KZ - Код подтверждения*\n\n"
                    f"Ваш код для подписания договора:\n"
                    f"`{otp_code}`\n\n"
                    f"Скопируйте этот код и вернитесь на сайт для подтверждения.\n\n"
                    f"⚠️ Код действителен 10 минут.",
                    parse_mode='Markdown'
                )
                print(f"✅ Sent OTP {otp_code} to {username} for contract {contract_id}")
            else:
                await update.message.reply_text(
                    "❌ Код не найден. Пожалуйста, попробуйте снова с сайта."
                )
                print(f"❌ No verification found for contract {contract_id}")
        except Exception as e:
            print(f"❌ Error fetching OTP: {e}")
            await update.message.reply_text(
                "❌ Ошибка при получении кода. Попробуйте снова."
            )
    else:
        # Regular /start without deep link
        await update.message.reply_text(
            "✅ Добро пожаловать в Signify KZ!\n\n"
            "Этот бот будет отправлять вам коды подтверждения для подписания договоров.\n\n"
            "Для получения кода нажмите кнопку 'Telegram' на сайте при подписании договора."
        )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка всех сообщений"""
    print(f"📩 Message from {update.effective_user.username}: {update.message.text}")

def main():
    """Запуск бота"""
    print("🤖 Starting Telegram Bot for Signify KZ...")
    print(f"🔑 Token: {TELEGRAM_BOT_TOKEN[:20]}...")
    
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    print("✅ Bot is running. Press Ctrl+C to stop.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()

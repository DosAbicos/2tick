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
    """Команда /start with deep link support and code regeneration"""
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
        
        try:
            from datetime import datetime, timezone, timedelta
            import random
            
            # Check if user has received codes for this contract before
            # Count BEFORE generating new code
            existing_codes_count = await db.verifications.count_documents({
                "contract_id": contract_id,
                "method": "telegram"
            })
            
            is_first_time = (existing_codes_count == 0)
            
            print(f"📊 Contract {contract_id}: existing codes = {existing_codes_count}, is_first_time = {is_first_time}")
            
            # Send welcome message on first time only
            if is_first_time:
                await update.message.reply_text(
                    "✅ *Добро пожаловать в Signify KZ!*\n\n"
                    "Этот бот отправляет коды подтверждения для подписания договоров.\n\n"
                    "Сейчас я отправлю вам код...",
                    parse_mode='Markdown'
                )
                # Small delay for better UX
                await asyncio.sleep(1)
            
            # Generate NEW code every time /start is pressed
            new_otp_code = f"{random.randint(100000, 999999)}"
            
            # Store new verification
            verification_data = {
                "contract_id": contract_id,
                "otp_code": new_otp_code,
                "method": "telegram",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                "verified": False
            }
            
            await db.verifications.insert_one(verification_data)
            
            # Send the code
            if is_first_time:
                message = (
                    f"🔐 *Ваш код подтверждения:*\n\n"
                    f"`{new_otp_code}`\n\n"
                    f"📋 Нажмите на код чтобы скопировать\n"
                    f"🔄 Вернитесь на сайт и вставьте код\n\n"
                    f"⚠️ Код действителен 10 минут\n\n"
                    f"💡 Если нужен новый код - просто нажмите /start снова"
                )
            else:
                message = (
                    f"🔐 *Новый код подтверждения:*\n\n"
                    f"`{new_otp_code}`\n\n"
                    f"📋 Нажмите на код чтобы скопировать\n\n"
                    f"⚠️ Код действителен 10 минут"
                )
            
            await update.message.reply_text(message, parse_mode='Markdown')
            
            print(f"✅ Generated and sent NEW OTP {new_otp_code} to {username} for contract {contract_id} (Attempt #{previous_verifications + 1})")
            
        except Exception as e:
            print(f"❌ Error generating OTP: {e}")
            import traceback
            print(traceback.format_exc())
            await update.message.reply_text(
                "❌ Ошибка при генерации кода. Попробуйте снова с сайта."
            )
    else:
        # Regular /start without deep link
        await update.message.reply_text(
            "✅ *Добро пожаловать в Signify KZ!*\n\n"
            "Этот бот отправляет коды подтверждения для подписания договоров.\n\n"
            "🔗 Для получения кода нажмите кнопку *'Получить код в Telegram'* на сайте при подписании договора.",
            parse_mode='Markdown'
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

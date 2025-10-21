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

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
CHAT_IDS_FILE = '/tmp/telegram_chat_ids.json'

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
    """Команда /start"""
    # Store chat ID for this user
    username = update.effective_user.username
    chat_id = update.effective_chat.id
    
    if username:
        chat_ids = load_chat_ids()
        chat_ids[username] = chat_id
        save_chat_ids(chat_ids)
        print(f"✅ User {username} started bot, chat_id: {chat_id}")
    
    await update.message.reply_text(
        "✅ Добро пожаловать в Signify KZ!\n\n"
        "Этот бот будет отправлять вам коды подтверждения для подписания договоров.\n\n"
        "Теперь вы можете получать коды верификации в Telegram."
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

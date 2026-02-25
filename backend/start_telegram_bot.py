#!/usr/bin/env python3
"""
Telegram Bot для 2tick.kz - запуск
Этот бот отвечает на /start и готов принимать сообщения для OTP
"""

import asyncio
from telegram import Bot, Update, InlineKeyboardButton, InlineKeyboardMarkup, CopyTextButton
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
    """Команда /start with deep link support for contracts and registrations"""
    username = update.effective_user.username
    chat_id = update.effective_chat.id
    
    # Save chat ID
    if username:
        chat_ids = load_chat_ids()
        chat_ids[username] = chat_id
        save_chat_ids(chat_ids)
        print(f"✅ User {username} started bot, chat_id: {chat_id}")
    
    # Check if this is a deep link
    if context.args and len(context.args) > 0:
        link_param = context.args[0]
        print(f"🔗 Deep link detected: {link_param}")
        
        try:
            from datetime import datetime, timezone, timedelta
            import random
            
            # Check if this is a registration link (starts with "reg_")
            if link_param.startswith("reg_"):
                registration_id = link_param[4:]  # Remove "reg_" prefix
                print(f"📝 Registration verification: registration_id={registration_id}")
                
                # Get language from registration
                registration = await db.registrations.find_one({"id": registration_id})
                language = 'ru'
                if registration and registration.get('language'):
                    language = registration.get('language', 'ru').lower()
                
                if language not in ['ru', 'kk', 'en']:
                    language = 'ru'
                
                # Translations for registration
                translations = {
                    'ru': {
                        'welcome': "✅ *Добро пожаловать в 2tick.kz!*\n\nПодтверждение регистрации через Telegram.\n\nСейчас я отправлю вам код...",
                        'message': 'Ваш код',
                        'button': '📋 Скопировать код'
                    },
                    'kk': {
                        'welcome': "✅ *2tick.kz-ге қош келдіңіз!*\n\nTelegram арқылы тіркелуді растау.\n\nМен сізге кодты жіберемін...",
                        'message': 'Сіздің кодыңыз',
                        'button': '📋 Кодты көшіру'
                    },
                    'en': {
                        'welcome': "✅ *Welcome to 2tick.kz!*\n\nRegistration confirmation via Telegram.\n\nI will send you a code now...",
                        'message': 'Your code is',
                        'button': '📋 Copy Code'
                    }
                }
                
                # Check if user has received codes for this registration before
                existing_codes_count = await db.verifications.count_documents({
                    "registration_id": registration_id,
                    "method": "telegram"
                })
                
                is_first_time = (existing_codes_count == 0)
                
                print(f"📊 Registration {registration_id}: existing codes = {existing_codes_count}, is_first_time = {is_first_time}, language = {language}")
                
                # Send welcome message on first time only
                if is_first_time:
                    await update.message.reply_text(
                        translations[language]['welcome'],
                        parse_mode='Markdown'
                    )
                    await asyncio.sleep(1)
                
                # Generate NEW code every time /start is pressed
                new_otp_code = f"{random.randint(100000, 999999)}"
                
                # Delete any old verification records for this registration
                await db.verifications.delete_many({
                    "registration_id": registration_id,
                    "method": "telegram"
                })
                
                # Store new verification
                verification_data = {
                    "registration_id": registration_id,
                    "otp_code": new_otp_code,
                    "method": "telegram",
                    "telegram_username": username,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                    "verified": False
                }
                
                await db.verifications.insert_one(verification_data)
                print(f"🗑️ Deleted old verifications for registration {registration_id}")
                
                # Send the code with inline button for copying (localized)
                msg_text = translations[language]['message']
                btn_text = translations[language]['button']
                
                message = f"{msg_text} `{new_otp_code}`"
                keyboard = [[InlineKeyboardButton(btn_text, copy_text=CopyTextButton(text=new_otp_code))]]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(message, parse_mode='Markdown', reply_markup=reply_markup)
                print(f"✅ Generated and sent NEW OTP {new_otp_code} to {username} for registration {registration_id} (Request #{existing_codes_count + 1})")
                
            else:
                # Contract verification (existing logic)
                contract_id = link_param
                print(f"📄 Contract verification: contract_id={contract_id}")
                
                # Get language from signature or contract
                signature = await db.signatures.find_one({"contract_id": contract_id})
                contract = await db.contracts.find_one({"id": contract_id})
                
                # Determine language (from signature, then contract, then default to ru)
                language = 'ru'
                if signature and signature.get('language'):
                    language = signature.get('language', 'ru').lower()
                elif contract and contract.get('contract_language'):
                    language = contract.get('contract_language', 'ru').lower()
                
                if language not in ['ru', 'kk', 'en']:
                    language = 'ru'
                
                # Translations
                translations = {
                    'ru': {
                        'welcome': "✅ *Добро пожаловать в 2tick.kz!*\n\nЭтот бот отправляет коды подтверждения для подписания договоров.\n\nСейчас я отправлю вам код...",
                        'message': 'Ваш код',
                        'button': '📋 Скопировать код'
                    },
                    'kk': {
                        'welcome': "✅ *2tick.kz-ге қош келдіңіз!*\n\nБұл бот келісімшарттарға қол қою үшін растау кодтарын жібереді.\n\nМен сізге кодты жіберемін...",
                        'message': 'Сіздің кодыңыз',
                        'button': '📋 Кодты көшіру'
                    },
                    'en': {
                        'welcome': "✅ *Welcome to 2tick.kz!*\n\nThis bot sends verification codes for signing contracts.\n\nI will send you a code now...",
                        'message': 'Your code is',
                        'button': '📋 Copy Code'
                    }
                }
                
                existing_codes_count = await db.verifications.count_documents({
                    "contract_id": contract_id,
                    "method": "telegram"
                })
                
                is_first_time = (existing_codes_count == 0)
                
                print(f"📊 Contract {contract_id}: existing codes = {existing_codes_count}, is_first_time = {is_first_time}, language = {language}")
                
                if is_first_time:
                    await update.message.reply_text(
                        translations[language]['welcome'],
                        parse_mode='Markdown'
                    )
                    await asyncio.sleep(1)
                
                new_otp_code = f"{random.randint(100000, 999999)}"
                
                # Delete any old verification records for this contract
                await db.verifications.delete_many({
                    "contract_id": contract_id,
                    "method": "telegram"
                })
                
                verification_data = {
                    "contract_id": contract_id,
                    "otp_code": new_otp_code,
                    "method": "telegram",
                    "telegram_username": username,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                    "verified": False
                }
                
                await db.verifications.insert_one(verification_data)
                print(f"🗑️ Deleted old verifications for contract {contract_id}")
                
                # Send the code with inline button for copying (localized)
                msg_text = translations[language]['message']
                btn_text = translations[language]['button']
                
                message = f"{msg_text} `{new_otp_code}`"
                keyboard = [[InlineKeyboardButton(btn_text, copy_text=CopyTextButton(text=new_otp_code))]]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(message, parse_mode='Markdown', reply_markup=reply_markup)
                print(f"✅ Generated and sent NEW OTP {new_otp_code} to {username} for contract {contract_id} (Request #{existing_codes_count + 1})")
            
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
            "✅ *Добро пожаловать в 2tick.kz!*\n\n"
            "Этот бот отправляет коды подтверждения для:\n"
            "• Регистрации на сайте\n"
            "• Подписания договоров\n\n"
            "🔗 Для получения кода используйте кнопку на сайте.",
            parse_mode='Markdown'
        )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка всех сообщений"""
    print(f"📩 Message from {update.effective_user.username}: {update.message.text}")

def main():
    """Запуск бота"""
    print("🤖 Starting Telegram Bot for 2tick.kz...", flush=True)
    print(f"🔑 Token: {TELEGRAM_BOT_TOKEN[:20]}...", flush=True)
    
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    print("✅ Bot is running. Press Ctrl+C to stop.", flush=True)
    application.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)

if __name__ == '__main__':
    main()

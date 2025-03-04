import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from supabase import Client, create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

API_TOKEN = os.getenv("API_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID"))

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    user_data = {"user_id": user.id, "username": user.username, "first_name": user.first_name, "last_name": user.last_name}
    supabase.table("users").insert(user_data).execute()
    await update.message.reply_text(f"Привет, {user.first_name}! Добро пожаловать в Totick 🚀")

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(update.message.text)

def main() -> None:
    application = Application.builder().token(API_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("echo", echo))

    application.run_polling()

if __name__ == "__main__":
    main()

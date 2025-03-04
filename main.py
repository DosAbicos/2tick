import os
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters
from supabase import create_client, Client
from fastapi import FastAPI
from starlette.requests import Request
import uvicorn

# Загружаем ключи из .env
BOT_TOKEN = os.getenv("BOT_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

async def start(update: Update, context):
    user = update.effective_user
    user_data = {
        "telegram_id": user.id,
        "username": user.username
    }

    # Проверяем, есть ли пользователь в БД
    response = supabase.table("users").select("id").eq("telegram_id", user.id).execute()

    if len(response.data) == 0:
        supabase.table("users").insert(user_data).execute()
        await update.message.reply_text("✅ Добро пожаловать в Totick!")
    else:
        await update.message.reply_text("👋 С возвращением!")

async def help(update: Update, context):
    await update.message.reply_text("📝 Команды:\n/start — Запуск бота\n/help — Помощь")

@app.post("/")
async def webhook(request: Request):
    update = Update.de_json(await request.json(), app.bot)
    await app.application.process_update(update)
    return {"status": "ok"}

async def set_webhook():
    webhook_url = os.getenv("WEBHOOK_URL")
    await app.bot.set_webhook(url=webhook_url)

async def on_startup():
    print("🚀 Бот запущен через Webhook")
    await set_webhook()

if __name__ == "__main__":
    app.bot = Application.builder().token(BOT_TOKEN).build()
    app.application = app.bot
    app.bot.add_handler(CommandHandler("start", start))
    app.bot.add_handler(CommandHandler("help", help))
    uvicorn.run(app, host="0.0.0.0", port=8000, lifespan="on")

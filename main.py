import os
from telegram import Update
from telegram.ext import Application, CommandHandler
from supabase import create_client, Client

# Загружаем ключи из .env
BOT_TOKEN = os.getenv("BOT_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def start(update: Update, context):
    user = update.effective_user
    user_data = {
        "telegram_id": user.id,
        "username": user.username
    }

    # Проверяем, есть ли пользователь в БД
    response = supabase.table("users").select("id").eq("telegram_id", user.id).execute()

    if len(response.data) == 0:
        # Если пользователя нет — регистрируем
        supabase.table("users").insert(user_data).execute()
        await update.message.reply_text("✅ Вы успешно зарегистрированы!")
    else:
        await update.message.reply_text("👋 Вы уже зарегистрированы!")

async def help(update: Update, context):
    await update.message.reply_text("📝 Команды:\n/start — Запуск бота\n/help — Помощь")

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help))

    print("🚀 Бот запущен")
    app.run_polling()

if __name__ == "__main__":
    main()

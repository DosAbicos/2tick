import os
from telegram import Update
from telegram.ext import Application, CommandHandler
from telegram.ext import Application, CommandHandler, MessageHandler, filters
from supabase import create_client, Client

# Загружаем ключи из .env
@@ -16,22 +16,55 @@ async def start(update: Update, context):
        "username": user.username
    }

    # Проверяем, есть ли пользователь в БД
    response = supabase.table("users").select("id").eq("telegram_id", user.id).execute()

    if len(response.data) == 0:
        # Если пользователя нет — регистрируем
        supabase.table("users").insert(user_data).execute()
        await update.message.reply_text("✅ Вы успешно зарегистрированы!")
        await update.message.reply_text("✅ Добро пожаловать в Totick!")
    else:
        await update.message.reply_text("👋 Вы уже зарегистрированы!")
        await update.message.reply_text("👋 С возвращением!")

async def add_task(update: Update, context):
    user = update.effective_user
    task_text = " ".join(context.args)

    if not task_text:
        await update.message.reply_text("❗ Пожалуйста, укажите текст задачи после команды.")
        return

    task_data = {
        "telegram_id": user.id,
        "task": task_text,
        "status": "🔥"
    }

    supabase.table("tasks").insert(task_data).execute()
    await update.message.reply_text(f"✅ Задача добавлена: {task_text}")

async def list_tasks(update: Update, context):
    user = update.effective_user
    response = supabase.table("tasks").select("task", "status").eq("telegram_id", user.id).execute()

    if len(response.data) == 0:
        await update.message.reply_text("❗ У вас пока нет задач.")
        return

    message = "📋 Ваши задачи:\n"
    for task in response.data:
        message += f"{task['status']} {task['task']}\n"

    await update.message.reply_text(message)

async def help(update: Update, context):
    await update.message.reply_text("📝 Команды:\n/start — Запуск бота\n/help — Помощь")
    await update.message.reply_text(
        "📝 Команды:\n/start — Запуск бота\n/task <текст> — Добавить задачу\n/tasks — Список задач\n/help — Помощь"
    )

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("task", add_task))
    app.add_handler(CommandHandler("tasks", list_tasks))
    app.add_handler(CommandHandler("help", help))

    print("🚀 Бот запущен")

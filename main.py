import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

API_TOKEN = os.getenv("API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Инициализация Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Логирование
logging.basicConfig(level=logging.INFO)

# Инициализация бота и диспетчера
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

# Состояния
class TaskForm(StatesGroup):
    text = State()
    category = State()

# Кнопки главного меню
main_menu = ReplyKeyboardMarkup(keyboard=[
    [KeyboardButton(text="Добавить задачу"), KeyboardButton(text="Просмотр задач")],
], resize_keyboard=True)

# Inline-кнопки для категорий задач
category_keyboard = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="🔥 Срочные", callback_data="urgent"),
     InlineKeyboardButton(text="✅ Запланированные", callback_data="planned")],
    [InlineKeyboardButton(text="🔁 Делегированные", callback_data="delegated"),
     InlineKeyboardButton(text="❌ Удаленные", callback_data="deleted")]
])

# Обработчик команды /start
@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    telegram_id = message.from_user.id
    username = message.from_user.username

    # Проверяем, есть ли пользователь в БД
    user = supabase.table("users").select("id").eq("telegram_id", telegram_id).single().execute()

    if user.data:
        await message.answer("С возвращением! Что сделаем сегодня?", reply_markup=main_menu)
    else:
        supabase.table("users").insert({"telegram_id": telegram_id, "username": username}).execute()
        await message.answer("Добро пожаловать в Totick! Чем займемся?", reply_markup=main_menu)

# Обработчик кнопки "Добавить задачу"
@dp.message(F.text == "Добавить задачу")
async def add_task(message: types.Message, state: FSMContext):
    await message.answer("Напиши текст задачи:", reply_markup=types.ReplyKeyboardRemove())
    await state.set_state(TaskForm.text)

# Получаем текст задачи
@dp.message(TaskForm.text)
async def process_task_text(message: types.Message, state: FSMContext):
    await state.update_data(text=message.text)
    await message.answer("Выбери категорию задачи:", reply_markup=category_keyboard)
    await state.set_state(TaskForm.category)

# Получаем категорию задачи
@dp.callback_query(TaskForm.category)
async def select_category(callback: types.CallbackQuery, state: FSMContext):
    data = await state.get_data()
    task_text = data["text"]
    category = callback.data
    telegram_id = callback.from_user.id

    # Получаем user_id по telegram_id
    user = supabase.table("users").select("id").eq("telegram_id", telegram_id).single().execute()
    user_id = user.data["id"]

    # Сохраняем задачу
    supabase.table("tasks").insert({
        "user_id": user_id,
        "text": task_text,
        "category": category,
        "status": "new"
    }).execute()

    await callback.message.answer("Задача добавлена!", reply_markup=main_menu)
    await state.clear()

    await callback.answer()

if __name__ == "__main__":
    dp.run_polling(bot)

#!/usr/bin/env python3
"""
Скрипт для сброса пароля пользователя
Usage: python3 reset_password.py <email> <new_password>
"""
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import bcrypt

load_dotenv()

async def reset_password(email: str, new_password: str):
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'signify_kz_db')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Найти пользователя по email
    user = await db.users.find_one({"email": email})
    
    if not user:
        print(f"❌ Пользователь с email '{email}' не найден")
        return False
    
    # Хешировать новый пароль
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Обновить пароль
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password": password_hash}}
    )
    
    if result.modified_count > 0:
        print(f"✅ Пароль для пользователя '{email}' успешно изменен!")
        print(f"   Новый пароль: {new_password}")
        print(f"   Имя: {user.get('full_name', 'Не указано')}")
        print(f"   Роль: {user.get('role', 'creator')}")
        print(f"\n🔐 Для входа используйте:")
        print(f"   Email: {email}")
        print(f"   Пароль: {new_password}")
        return True
    else:
        print(f"⚠️ Пароль не был изменен (возможно уже установлен)")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("🔧 Использование:")
        print("  python3 reset_password.py <email> <new_password>")
        print("\nПример:")
        print("  python3 reset_password.py user@example.com NewPassword123")
        sys.exit(1)
    
    email = sys.argv[1]
    new_password = sys.argv[2]
    asyncio.run(reset_password(email, new_password))

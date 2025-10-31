#!/usr/bin/env python3
"""
Скрипт для назначения роли администратора пользователю
Usage: python3 make_admin.py <email>
"""
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def make_admin(email: str):
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'signify_kz_db')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Найти пользователя по email
    user = await db.users.find_one({"email": email})
    
    if not user:
        print(f"❌ Пользователь с email '{email}' не найден")
        return False
    
    # Обновить роль на admin
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"role": "admin"}}
    )
    
    if result.modified_count > 0:
        print(f"✅ Пользователь '{email}' теперь администратор!")
        print(f"   Имя: {user.get('full_name', 'Не указано')}")
        print(f"   Доступ: http://localhost:3000/admin")
        return True
    else:
        print(f"⚠️  Пользователь '{email}' уже был администратором")
        return True

async def list_users():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.signify_kz
    
    users = await db.users.find({}, {"email": 1, "full_name": 1, "role": 1}).limit(10).to_list(10)
    
    if not users:
        print("❌ Пользователи не найдены")
        return
    
    print("\n📋 Доступные пользователи:")
    print("-" * 70)
    for user in users:
        role = user.get('role', 'creator')
        print(f"  Email: {user.get('email'):<40} Роль: {role:<10}")
        print(f"  Имя:   {user.get('full_name', 'Не указано')}")
        print("-" * 70)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("🔧 Использование:")
        print("  python3 make_admin.py <email>        - Назначить администратора")
        print("  python3 make_admin.py --list         - Показать всех пользователей")
        print("\nПример:")
        print("  python3 make_admin.py user@example.com")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        asyncio.run(list_users())
    else:
        email = sys.argv[1]
        asyncio.run(make_admin(email))

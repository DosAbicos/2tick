#!/usr/bin/env python3
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def check_database():
    # Подключение к MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/signify_kz')
    client = AsyncIOMotorClient(mongo_url)
    db = client.signify_kz
    
    try:
        print("📊 Current database status:")
        
        # Пользователи
        users = await db.users.find({}, {"_id": 0, "id": 1, "email": 1, "full_name": 1}).to_list(None)
        print(f"\n👥 Users ({len(users)}):")
        for user in users:
            print(f"  - {user['email']} | ID: {user['id']} | Name: {user.get('full_name', 'N/A')}")
        
        # Договоры
        contracts = await db.contracts.find({}, {"_id": 0, "id": 1, "title": 1, "landlord_id": 1, "status": 1}).to_list(None)
        print(f"\n📄 Contracts ({len(contracts)}):")
        for contract in contracts:
            print(f"  - {contract.get('title', 'No title')} | Status: {contract.get('status')} | Landlord: {contract.get('landlord_id')}")
        
        # Шаблоны
        templates = await db.templates.find({}, {"_id": 0, "id": 1, "title": 1, "is_active": 1}).to_list(None)
        print(f"\n📋 Templates ({len(templates)}):")
        for template in templates[:5]:  # Показать первые 5
            print(f"  - {template.get('title', 'No title')} | Active: {template.get('is_active')} | ID: {template.get('id')}")
        
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(check_database())
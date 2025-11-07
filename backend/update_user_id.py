#!/usr/bin/env python3
import asyncio
import os
import random
from motor.motor_asyncio import AsyncIOMotorClient

def generate_user_id():
    """Generate a random 10-digit user ID"""
    return str(random.randint(1000000000, 9999999999))

async def update_user_id():
    # Подключение к правильной MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.signify_kz_db
    
    old_email = "asl@asl.kz"
    
    try:
        print(f"🔍 Searching for user: {old_email}")
        
        # Найти пользователя
        user = await db.users.find_one({"email": old_email})
        if not user:
            print(f"❌ User {old_email} not found!")
            return
        
        old_id = user["id"]
        new_id = generate_user_id()
        
        print(f"👤 Found user: {old_email}")
        print(f"📋 Old ID: {old_id}")
        print(f"🆕 New ID: {new_id}")
        
        # Проверим что новый ID уникален
        existing = await db.users.find_one({"id": new_id})
        while existing:
            new_id = generate_user_id()
            existing = await db.users.find_one({"id": new_id})
            print(f"🔄 Generating new unique ID: {new_id}")
        
        print(f"\n🔄 Starting ID update process...")
        
        # 1. Обновить ID пользователя
        result = await db.users.update_one(
            {"email": old_email},
            {"$set": {"id": new_id}}
        )
        print(f"✅ Updated user ID: {result.modified_count} user updated")
        
        # 2. Обновить все договоры где landlord_id = old_id
        contracts_result = await db.contracts.update_many(
            {"landlord_id": old_id},
            {"$set": {"landlord_id": new_id}}
        )
        print(f"✅ Updated contracts landlord_id: {contracts_result.modified_count} contracts updated")
        
        # 3. Обновить все логи где user_id = old_id
        logs_result = await db.user_logs.update_many(
            {"user_id": old_id},
            {"$set": {"user_id": new_id}}
        )
        print(f"✅ Updated user logs: {logs_result.modified_count} logs updated")
        
        # 4. Обновить любые другие связи (audit_logs, если есть)
        try:
            audit_result = await db.audit_logs.update_many(
                {"user_id": old_id},
                {"$set": {"user_id": new_id}}
            )
            print(f"✅ Updated audit logs: {audit_result.modified_count} audit logs updated")
        except Exception as e:
            print(f"⚠️  Audit logs update (optional): {e}")
        
        print(f"\n🎉 ID update completed successfully!")
        print(f"📊 Summary:")
        print(f"  - User: {old_email}")
        print(f"  - Old ID: {old_id}")
        print(f"  - New ID: {new_id}")
        print(f"  - Updated contracts: {contracts_result.modified_count}")
        print(f"  - Updated logs: {logs_result.modified_count}")
        
        # Финальная проверка
        updated_user = await db.users.find_one({"email": old_email})
        updated_contracts = await db.contracts.count_documents({"landlord_id": new_id})
        print(f"\n✅ Verification:")
        print(f"  - User new ID: {updated_user['id']}")
        print(f"  - Contracts with new landlord_id: {updated_contracts}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(update_user_id())
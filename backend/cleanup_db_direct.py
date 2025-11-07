#!/usr/bin/env python3
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def cleanup_database():
    # Подключение к MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/signify_kz')
    client = AsyncIOMotorClient(mongo_url)
    db = client.signify_kz
    
    # Пользователи которых нужно сохранить
    keep_emails = ['asl@asl.kz', '2asl@asl.kz']
    
    try:
        print("🔍 Searching for users to keep...")
        
        # Найти пользователей которых нужно сохранить
        users_to_keep = await db.users.find({"email": {"$in": keep_emails}}, {"_id": 0, "id": 1, "email": 1}).to_list(None)
        keep_user_ids = [user["id"] for user in users_to_keep]
        
        print(f"✅ Found users to keep: {users_to_keep}")
        print(f"✅ User IDs to keep: {keep_user_ids}")
        
        # Подсчитаем что будет удалено
        users_to_delete_count = await db.users.count_documents({"email": {"$nin": keep_emails}})
        contracts_to_delete_count = await db.contracts.count_documents({"landlord_id": {"$nin": keep_user_ids}})
        logs_to_delete_count = await db.user_logs.count_documents({"user_id": {"$nin": keep_user_ids}})
        notifications_count = await db.notifications.count_documents({})
        registrations_count = await db.pending_registrations.count_documents({})
        
        print(f"\n📊 Will delete:")
        print(f"  - Users: {users_to_delete_count}")
        print(f"  - Contracts: {contracts_to_delete_count}")
        print(f"  - Logs: {logs_to_delete_count}")
        print(f"  - Notifications: {notifications_count}")
        print(f"  - Pending registrations: {registrations_count}")
        
        print(f"\n🗑️ Starting cleanup...")
        
        # Удалить всех пользователей кроме указанных
        delete_users_result = await db.users.delete_many({"email": {"$nin": keep_emails}})
        print(f"✅ Deleted {delete_users_result.deleted_count} users")
        
        # Удалить все договоры кроме тех что принадлежат оставшимся пользователям  
        delete_contracts_result = await db.contracts.delete_many({"landlord_id": {"$nin": keep_user_ids}})
        print(f"✅ Deleted {delete_contracts_result.deleted_count} contracts")
        
        # Удалить логи пользователей (кроме оставшихся)
        delete_logs_result = await db.user_logs.delete_many({"user_id": {"$nin": keep_user_ids}})
        print(f"✅ Deleted {delete_logs_result.deleted_count} user logs")
        
        # Удалить уведомления
        delete_notifications_result = await db.notifications.delete_many({})
        print(f"✅ Deleted {delete_notifications_result.deleted_count} notifications")
        
        # Удалить pending_registrations
        delete_registrations_result = await db.pending_registrations.delete_many({})
        print(f"✅ Deleted {delete_registrations_result.deleted_count} pending registrations")
        
        print(f"\n🎉 Database cleanup completed successfully!")
        print(f"📈 Final stats:")
        remaining_users = await db.users.count_documents({})
        remaining_contracts = await db.contracts.count_documents({})
        print(f"  - Remaining users: {remaining_users}")
        print(f"  - Remaining contracts: {remaining_contracts}")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_database())
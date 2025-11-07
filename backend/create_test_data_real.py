#!/usr/bin/env python3
import asyncio
import os
import bcrypt
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

async def create_test_data():
    # ПРАВИЛЬНОЕ подключение к MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client.signify_kz_db  # ИСПРАВЛЕНО: правильное имя базы
    
    try:
        print("🏗️ Creating test data in CORRECT database: signify_kz_db...")
        
        # Получить ID обоих пользователей
        users = await db.users.find({}, {"_id": 0, "id": 1, "email": 1}).to_list(None)
        print(f"✅ Found existing users: {users}")
        
        user1_id = None
        user2_id = None
        
        for user in users:
            if user['email'] == 'asl@asl.kz':
                user1_id = user['id']
            elif user['email'] == '2asl@asl.kz':
                user2_id = user['id']
        
        print(f"User 1 (asl@asl.kz): {user1_id}")
        print(f"User 2 (2asl@asl.kz): {user2_id}")
        
        # Создать тестовые шаблоны
        template1_id = str(uuid.uuid4())
        template1 = {
            "id": template1_id,
            "title": "Договор аренды жилья",
            "content": "Договор аренды между {{landlord_name}} и {{tenant_name}} на объект {{property_address}} за {{rent_amount}} тенге в месяц.",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "placeholders": {
                "landlord_name": {
                    "label": "ФИО Наймодателя",
                    "type": "text",
                    "required": True,
                    "owner": "landlord"
                },
                "tenant_name": {
                    "label": "ФИО Нанимателя", 
                    "type": "text",
                    "required": True,
                    "owner": "tenant"
                },
                "property_address": {
                    "label": "Адрес недвижимости",
                    "type": "text",
                    "required": True,
                    "owner": "landlord"
                },
                "rent_amount": {
                    "label": "Размер арендной платы",
                    "type": "number",
                    "required": True,
                    "owner": "landlord"
                }
            }
        }
        
        await db.templates.insert_one(template1)
        print(f"✅ Created template: {template1['title']}")
        
        # Создать тестовые договоры
        now = datetime.now(timezone.utc)
        contracts = []
        
        # 2 договора для первого пользователя (asl@asl.kz)
        for i in range(2):
            contract_id = str(uuid.uuid4())
            contract = {
                "id": contract_id,
                "title": f"Договор аренды квартиры №{i+1}",
                "content": f"Договор аренды между Admin User и Наниматель {i+1} на объект ул. Абая {i+1} за {150000 + i*10000} тенге в месяц.",
                "landlord_id": user1_id,
                "landlord_email": "asl@asl.kz",
                "landlord_full_name": "Admin User",
                "status": "signed" if i == 0 else "pending-signature",
                "contract_code": f"ASL{str(i+1).zfill(3)}",
                "created_at": now.isoformat(),
                "template_id": template1_id,
                "placeholder_values": {
                    "landlord_name": "Admin User",
                    "tenant_name": f"Наниматель {i+1}",
                    "property_address": f"ул. Абая {i+1}",
                    "rent_amount": str(150000 + i*10000)
                },
                "signer_name": f"Наниматель {i+1}",
                "signer_phone": f"+777711111{i}",
                "signer_email": f"tenant{i+1}@test.kz"
            }
            contracts.append(contract)
        
        # 3 договора для второго пользователя (2asl@asl.kz)
        for i in range(3):
            contract_id = str(uuid.uuid4())
            contract = {
                "id": contract_id,
                "title": f"Договор аренды офиса №{i+1}",
                "content": f"Договор аренды между Test User 2 и Арендатор {i+1} на объект пр. Назарбаева {i+10} за {200000 + i*15000} тенге в месяц.",
                "landlord_id": user2_id,
                "landlord_email": "2asl@asl.kz",
                "landlord_full_name": "Test User 2",
                "status": ["signed", "pending-signature", "draft"][i],
                "contract_code": f"TU2{str(i+1).zfill(3)}",
                "created_at": now.isoformat(),
                "template_id": template1_id,
                "placeholder_values": {
                    "landlord_name": "Test User 2",
                    "tenant_name": f"Арендатор {i+1}" if i < 2 else "",
                    "property_address": f"пр. Назарбаева {i+10}",
                    "rent_amount": str(200000 + i*15000)
                },
                "signer_name": f"Арендатор {i+1}" if i < 2 else "",
                "signer_phone": f"+777722222{i}" if i < 2 else "",
                "signer_email": f"renter{i+1}@test.kz" if i < 2 else ""
            }
            contracts.append(contract)
        
        await db.contracts.insert_many(contracts)
        print(f"✅ Created {len(contracts)} contracts")
        
        print(f"\n🎉 Test data creation completed!")
        print(f"📊 Summary:")
        print(f"  - Users: 2 (asl@asl.kz, 2asl@asl.kz)")
        print(f"  - Templates: 1")
        print(f"  - Contracts: {len(contracts)} (2 for user1, 3 for user2)")
        
        # Финальная проверка
        final_users = await db.users.count_documents({})
        final_contracts = await db.contracts.count_documents({})
        print(f"📈 Final database state:")
        print(f"  - Total users: {final_users}")
        print(f"  - Total contracts: {final_contracts}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_test_data())
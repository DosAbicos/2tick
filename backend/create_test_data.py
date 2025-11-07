#!/usr/bin/env python3
import asyncio
import os
import bcrypt
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

def generate_user_id():
    """Generate a random 10-digit user ID"""
    import random
    return str(random.randint(1000000000, 9999999999))

async def create_test_data():
    # Подключение к MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/signify_kz')
    client = AsyncIOMotorClient(mongo_url)
    db = client.signify_kz
    
    try:
        print("🏗️ Creating test data...")
        
        # Создать второго пользователя
        user2_id = generate_user_id()
        user2_password = bcrypt.hashpw("password123".encode(), bcrypt.gensalt()).decode()
        user2 = {
            "id": user2_id,
            "email": "2asl@asl.kz",
            "password": user2_password,
            "full_name": "Test User 2",
            "phone": "+7777123456",
            "company_name": "Test Company 2",
            "iin": "123456789012",
            "legal_address": "Test Address 2",
            "language": "ru",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "contract_limit": 10,
            "is_admin": False,
            "role": "user",
            "favorite_templates": []
        }
        
        await db.users.insert_one(user2)
        print(f"✅ Created user: {user2['email']} with ID: {user2_id}")
        
        # Получить ID первого пользователя
        user1 = await db.users.find_one({"email": "asl@asl.kz"})
        user1_id = user1["id"]
        
        # Создать тестовые шаблоны
        template1_id = str(uuid.uuid4())
        template1 = {
            "id": template1_id,
            "title": "Тестовый шаблон аренды",
            "content": "Договор аренды между {{landlord_name}} и {{tenant_name}} на сумму {{rent_amount}} тенге.",
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
        
        # Договор для первого пользователя
        contract1_id = str(uuid.uuid4())
        contract1 = {
            "id": contract1_id,
            "title": "Договор аренды квартиры №1",
            "content": "Договор аренды между Админ Юзер и Тестовый Наниматель на сумму 150000 тенге.",
            "landlord_id": user1_id,
            "landlord_email": "asl@asl.kz",
            "landlord_full_name": "Admin User",
            "status": "signed",
            "contract_code": "ASL001",
            "created_at": now.isoformat(),
            "template_id": template1_id,
            "placeholder_values": {
                "landlord_name": "Admin User",
                "tenant_name": "Тестовый Наниматель",
                "rent_amount": "150000"
            },
            "signer_name": "Тестовый Наниматель",
            "signer_phone": "+7777111111",
            "signer_email": "tenant1@test.kz"
        }
        
        # Договор для второго пользователя
        contract2_id = str(uuid.uuid4())
        contract2 = {
            "id": contract2_id,
            "title": "Договор аренды офиса №1",
            "content": "Договор аренды между Test User 2 и Арендатор Офиса на сумму 200000 тенге.",
            "landlord_id": user2_id,
            "landlord_email": "2asl@asl.kz", 
            "landlord_full_name": "Test User 2",
            "status": "pending-signature",
            "contract_code": "TU2001",
            "created_at": now.isoformat(),
            "template_id": template1_id,
            "placeholder_values": {
                "landlord_name": "Test User 2",
                "tenant_name": "Арендатор Офиса",
                "rent_amount": "200000"
            },
            "signer_name": "Арендатор Офиса",
            "signer_phone": "+7777222222",
            "signer_email": "tenant2@test.kz"
        }
        
        # Еще один договор для второго пользователя
        contract3_id = str(uuid.uuid4())
        contract3 = {
            "id": contract3_id,
            "title": "Договор аренды склада",
            "content": "Договор аренды между Test User 2 и Арендатор Склада на сумму 80000 тенге.",
            "landlord_id": user2_id,
            "landlord_email": "2asl@asl.kz",
            "landlord_full_name": "Test User 2", 
            "status": "draft",
            "contract_code": "TU2002",
            "created_at": now.isoformat(),
            "template_id": template1_id,
            "placeholder_values": {
                "landlord_name": "Test User 2",
                "tenant_name": "",
                "rent_amount": "80000"
            }
        }
        
        await db.contracts.insert_many([contract1, contract2, contract3])
        print(f"✅ Created 3 contracts")
        
        print(f"\n🎉 Test data creation completed!")
        print(f"📊 Summary:")
        print(f"  - Users: 2 (asl@asl.kz, 2asl@asl.kz)")
        print(f"  - Templates: 1")
        print(f"  - Contracts: 3 (1 for user1, 2 for user2)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_test_data())
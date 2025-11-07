#!/usr/bin/env python3
import asyncio
import aiohttp
import json

async def cleanup_database():
    # Сначала логинимся как админ
    login_data = {
        "email": "asl@asl.kz", 
        "password": "password"  # Нужно будет ввести правильный пароль
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            # Логин
            print("Trying to login...")
            async with session.post('http://localhost:8001/api/auth/login', json=login_data) as resp:
                if resp.status != 200:
                    print(f"Login failed: {resp.status}")
                    text = await resp.text()
                    print(f"Response: {text}")
                    return
                
                login_result = await resp.json()
                token = login_result['token']
                print(f"Login successful! Token: {token[:50]}...")
            
            # Очистка базы
            headers = {'Authorization': f'Bearer {token}'}
            print("Starting database cleanup...")
            async with session.post('http://localhost:8001/api/admin/cleanup-database', headers=headers) as resp:
                if resp.status != 200:
                    print(f"Cleanup failed: {resp.status}")
                    text = await resp.text()
                    print(f"Response: {text}")
                    return
                
                result = await resp.json()
                print("✅ Database cleanup completed!")
                print(json.dumps(result, indent=2, ensure_ascii=False))
                
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(cleanup_database())
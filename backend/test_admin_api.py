import requests
import json

# Сначала получаем токен
login_response = requests.post(
    'http://localhost:8001/api/auth/login',
    json={
        'email': 'a.nurgozha@asl.kz',
        'password': 'Admin123'
    }
)

if login_response.status_code == 200:
    token = login_response.json()['token']
    user = login_response.json().get('user', {})
    print(f"✅ Логин успешен")
    print(f"   Email: {user.get('email')}")
    print(f"   Роль: {user.get('role')}")
    print(f"   Token: {token[:20]}...")
    
    # Проверяем доступ к админке
    print("\n🔍 Проверка доступа к /admin/stats:")
    stats_response = requests.get(
        'http://localhost:8001/api/admin/stats',
        headers={'Authorization': f'Bearer {token}'}
    )
    
    print(f"   Статус: {stats_response.status_code}")
    if stats_response.status_code == 200:
        print(f"   ✅ Доступ разрешен!")
        print(f"   Данные: {json.dumps(stats_response.json(), indent=2, ensure_ascii=False)}")
    else:
        print(f"   ❌ Доступ запрещен")
        print(f"   Ответ: {stats_response.text}")
else:
    print(f"❌ Ошибка логина: {login_response.status_code}")
    print(f"   {login_response.text}")

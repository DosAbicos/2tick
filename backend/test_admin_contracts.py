import requests
import json

# Логин
login_response = requests.post(
    'http://localhost:8001/api/auth/login',
    json={
        'email': 'a.nurgozha@asl.kz',
        'password': 'Admin123'
    }
)

if login_response.status_code == 200:
    token = login_response.json()['token']
    print(f"✅ Логин успешен")
    
    # Получаем договоры
    contracts_response = requests.get(
        'http://localhost:8001/api/admin/contracts',
        headers={'Authorization': f'Bearer {token}'}
    )
    
    if contracts_response.status_code == 200:
        contracts = contracts_response.json()
        print(f"\n📄 Получено договоров: {len(contracts)}")
        print(f"   Лимит: 20 (последние договоры)")
        print(f"\n🔍 Первые 5 договоров (от новых к старым):")
        for i, contract in enumerate(contracts[:5], 1):
            print(f"   {i}. {contract.get('contract_code', 'N/A')} - {contract.get('title')} - {contract.get('created_at')[:19]}")
        
        # Проверка сортировки
        dates = [c.get('created_at') for c in contracts if c.get('created_at')]
        is_sorted = all(dates[i] >= dates[i+1] for i in range(len(dates)-1))
        
        if is_sorted:
            print(f"\n✅ Сортировка правильная: от новых к старым")
        else:
            print(f"\n❌ Ошибка сортировки!")
    else:
        print(f"❌ Ошибка получения договоров: {contracts_response.status_code}")
else:
    print(f"❌ Ошибка логина: {login_response.status_code}")

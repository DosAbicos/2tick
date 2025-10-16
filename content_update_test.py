#!/usr/bin/env python3
"""
Contract Content Update Testing for Signify KZ
Tests the contract content update functionality after signer fills in their data.

ТЕСТИРУЕМАЯ ФУНКЦИОНАЛЬНОСТЬ:
1. Создание договора с плейсхолдерами [ФИО], [Телефон], [Email]
2. Обновление данных нанимателя через POST /api/sign/{contract_id}/update-signer-info
3. Проверка автоматической замены плейсхолдеров на реальные значения в content
4. Проверка персистентности изменений
5. Повторное обновление и замена старых значений на новые
"""

import requests
import json
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Configuration
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://contractkz.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test data
TEST_USER = {
    "email": "content.test@signify.kz",
    "password": "SecurePass123!",
    "full_name": "Тестовый Пользователь",
    "phone": "+77771234567",
    "language": "ru"
}

# Contract with placeholders in content
TEST_CONTRACT_WITH_PLACEHOLDERS = {
    "title": "Договор аренды с плейсхолдерами",
    "content": """ДОГОВОР АРЕНДЫ ЖИЛОГО ПОМЕЩЕНИЯ

Настоящий договор заключается между:

АРЕНДОДАТЕЛЬ: Иванов Иван Иванович
Телефон: +7 (777) 123-45-67
Email: landlord@example.kz

АРЕНДАТОР: [ФИО]
Телефон: [Телефон]
Email: [Email]

1. ПРЕДМЕТ ДОГОВОРА
Арендодатель предоставляет, а арендатор [ФИО] принимает в аренду квартиру по адресу: г. Алматы, ул. Абая 150, кв. 25.

2. КОНТАКТНАЯ ИНФОРМАЦИЯ АРЕНДАТОРА
Для связи с арендатором использовать:
- ФИО: [ФИО]
- Мобильный телефон: [Телефон]
- Электронная почта: [Email]

3. ОБЯЗАТЕЛЬСТВА СТОРОН
Арендатор [ФИО] обязуется своевременно вносить арендную плату и поддерживать квартиру в надлежащем состоянии.
Все уведомления направлять на телефон [Телефон] или email [Email].

Подписи сторон:
Арендодатель: ________________
Арендатор [ФИО]: ________________ ([Телефон])""",
    "amount": "200000"
}

# First signer data
FIRST_SIGNER_DATA = {
    "signer_name": "Иванов Иван Иванович",
    "signer_phone": "+7 (707) 400-32-01",
    "signer_email": "ivanov@test.kz"
}

# Second signer data (for repeated update test)
SECOND_SIGNER_DATA = {
    "signer_name": "Петров Петр",
    "signer_phone": "+7 (707) 555-66-77", 
    "signer_email": "petrov@test.kz"
}

class ContentUpdateTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.contract_id = None
        
    def log(self, message, level="INFO"):
        print(f"[{level}] {message}")
        
    def test_user_auth(self):
        """Test user registration/login"""
        self.log("Testing user authentication...")
        
        # Try registration first
        url = f"{API_BASE}/auth/register"
        response = self.session.post(url, json=TEST_USER)
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get('token')
            self.log("✅ User registration successful")
            return True
        elif response.status_code == 400 and "already registered" in response.text:
            # User exists, try login
            self.log("User already exists, trying login...")
            login_url = f"{API_BASE}/auth/login"
            login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
            login_response = self.session.post(login_url, json=login_data)
            
            if login_response.status_code == 200:
                data = login_response.json()
                self.auth_token = data.get('token')
                self.log("✅ User login successful")
                return True
            else:
                self.log(f"❌ Login failed: {login_response.status_code} - {login_response.text}", "ERROR")
                return False
        else:
            self.log(f"❌ Registration failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_contract_creation_with_placeholders(self):
        """Test 1: Create contract with placeholders [ФИО], [Телефон], [Email]"""
        self.log("TEST 1: Creating contract with placeholders...")
        
        if not self.auth_token:
            self.log("❌ No auth token available", "ERROR")
            return False
            
        url = f"{API_BASE}/contracts"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.post(url, json=TEST_CONTRACT_WITH_PLACEHOLDERS, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.contract_id = data.get('id')
            content = data.get('content', '')
            
            self.log("✅ Contract created successfully")
            self.log(f"   Contract ID: {self.contract_id}")
            
            # Verify placeholders are present
            placeholders = ['[ФИО]', '[Телефон]', '[Email]']
            missing_placeholders = []
            
            for placeholder in placeholders:
                if placeholder not in content:
                    missing_placeholders.append(placeholder)
                else:
                    self.log(f"   ✅ Placeholder found: {placeholder}")
                    
            if missing_placeholders:
                self.log(f"❌ Missing placeholders: {missing_placeholders}", "ERROR")
                return False
            else:
                self.log("✅ All placeholders present in contract content")
                return True
        else:
            self.log(f"❌ Contract creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_first_signer_update(self):
        """Test 2: Update signer info and verify placeholder replacement"""
        self.log("TEST 2: Updating signer info (first time)...")
        
        if not self.contract_id:
            self.log("❌ No contract ID available", "ERROR")
            return False
            
        url = f"{API_BASE}/sign/{self.contract_id}/update-signer-info"
        response = self.session.post(url, json=FIRST_SIGNER_DATA)
        
        if response.status_code == 200:
            data = response.json()
            self.log("✅ Signer info update successful")
            
            # Check response contains updated content
            contract_data = data.get('contract', {})
            updated_content = contract_data.get('content', '')
            
            if not updated_content:
                self.log("❌ No content returned in response", "ERROR")
                return False
                
            # Verify placeholders are replaced
            success = True
            
            # Check [ФИО] replacement
            if '[ФИО]' in updated_content:
                self.log("❌ Placeholder [ФИО] not replaced", "ERROR")
                success = False
            elif FIRST_SIGNER_DATA['signer_name'] in updated_content:
                self.log(f"✅ [ФИО] replaced with: {FIRST_SIGNER_DATA['signer_name']}")
            else:
                self.log("❌ [ФИО] replaced but name not found in content", "ERROR")
                success = False
                
            # Check [Телефон] replacement
            if '[Телефон]' in updated_content:
                self.log("❌ Placeholder [Телефон] not replaced", "ERROR")
                success = False
            elif FIRST_SIGNER_DATA['signer_phone'] in updated_content:
                self.log(f"✅ [Телефон] replaced with: {FIRST_SIGNER_DATA['signer_phone']}")
            else:
                self.log("❌ [Телефон] replaced but phone not found in content", "ERROR")
                success = False
                
            # Check [Email] replacement
            if '[Email]' in updated_content:
                self.log("❌ Placeholder [Email] not replaced", "ERROR")
                success = False
            elif FIRST_SIGNER_DATA['signer_email'] in updated_content:
                self.log(f"✅ [Email] replaced with: {FIRST_SIGNER_DATA['signer_email']}")
            else:
                self.log("❌ [Email] replaced but email not found in content", "ERROR")
                success = False
                
            if success:
                self.log("✅ All placeholders successfully replaced with real values")
                return True
            else:
                self.log("❌ Placeholder replacement failed", "ERROR")
                return False
        else:
            self.log(f"❌ Signer info update failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_persistence_check(self):
        """Test 3: Verify changes are persisted in database"""
        self.log("TEST 3: Checking persistence of content changes...")
        
        if not self.contract_id:
            self.log("❌ No contract ID available", "ERROR")
            return False
            
        url = f"{API_BASE}/sign/{self.contract_id}"
        response = self.session.get(url)
        
        if response.status_code == 200:
            contract = response.json()
            content = contract.get('content', '')
            
            self.log("✅ Contract fetched successfully")
            
            # Verify data is persisted
            success = True
            
            # Check signer data
            if contract.get('signer_name') != FIRST_SIGNER_DATA['signer_name']:
                self.log(f"❌ Signer name not persisted: {contract.get('signer_name')}", "ERROR")
                success = False
            else:
                self.log(f"✅ Signer name persisted: {contract.get('signer_name')}")
                
            if contract.get('signer_phone') != FIRST_SIGNER_DATA['signer_phone']:
                self.log(f"❌ Signer phone not persisted: {contract.get('signer_phone')}", "ERROR")
                success = False
            else:
                self.log(f"✅ Signer phone persisted: {contract.get('signer_phone')}")
                
            if contract.get('signer_email') != FIRST_SIGNER_DATA['signer_email']:
                self.log(f"❌ Signer email not persisted: {contract.get('signer_email')}", "ERROR")
                success = False
            else:
                self.log(f"✅ Signer email persisted: {contract.get('signer_email')}")
                
            # Check content has real values (no placeholders)
            if '[ФИО]' in content or '[Телефон]' in content or '[Email]' in content:
                self.log("❌ Placeholders still present in persisted content", "ERROR")
                success = False
            else:
                self.log("✅ No placeholders in persisted content")
                
            # Check real values are in content
            if (FIRST_SIGNER_DATA['signer_name'] in content and 
                FIRST_SIGNER_DATA['signer_phone'] in content and 
                FIRST_SIGNER_DATA['signer_email'] in content):
                self.log("✅ Real signer values present in persisted content")
            else:
                self.log("❌ Real signer values not found in persisted content", "ERROR")
                success = False
                
            return success
        else:
            self.log(f"❌ Failed to fetch contract: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_repeated_update(self):
        """Test 4: Repeated update - old values should be replaced with new ones"""
        self.log("TEST 4: Testing repeated update (old values → new values)...")
        
        if not self.contract_id:
            self.log("❌ No contract ID available", "ERROR")
            return False
            
        url = f"{API_BASE}/sign/{self.contract_id}/update-signer-info"
        response = self.session.post(url, json=SECOND_SIGNER_DATA)
        
        if response.status_code == 200:
            data = response.json()
            self.log("✅ Second signer info update successful")
            
            # Check response contains updated content
            contract_data = data.get('contract', {})
            updated_content = contract_data.get('content', '')
            
            if not updated_content:
                self.log("❌ No content returned in response", "ERROR")
                return False
                
            success = True
            
            # Verify OLD values are replaced with NEW values
            
            # Check old name is replaced
            if FIRST_SIGNER_DATA['signer_name'] in updated_content:
                self.log(f"❌ Old name still present: {FIRST_SIGNER_DATA['signer_name']}", "ERROR")
                success = False
            elif SECOND_SIGNER_DATA['signer_name'] in updated_content:
                self.log(f"✅ Old name replaced with new: {SECOND_SIGNER_DATA['signer_name']}")
            else:
                self.log("❌ New name not found in content", "ERROR")
                success = False
                
            # Check old phone is replaced
            if FIRST_SIGNER_DATA['signer_phone'] in updated_content:
                self.log(f"❌ Old phone still present: {FIRST_SIGNER_DATA['signer_phone']}", "ERROR")
                success = False
            elif SECOND_SIGNER_DATA['signer_phone'] in updated_content:
                self.log(f"✅ Old phone replaced with new: {SECOND_SIGNER_DATA['signer_phone']}")
            else:
                self.log("❌ New phone not found in content", "ERROR")
                success = False
                
            # Check old email is replaced
            if FIRST_SIGNER_DATA['signer_email'] in updated_content:
                self.log(f"❌ Old email still present: {FIRST_SIGNER_DATA['signer_email']}", "ERROR")
                success = False
            elif SECOND_SIGNER_DATA['signer_email'] in updated_content:
                self.log(f"✅ Old email replaced with new: {SECOND_SIGNER_DATA['signer_email']}")
            else:
                self.log("❌ New email not found in content", "ERROR")
                success = False
                
            if success:
                self.log("✅ All old values successfully replaced with new values")
                return True
            else:
                self.log("❌ Old value replacement failed", "ERROR")
                return False
        else:
            self.log(f"❌ Second signer info update failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_final_persistence_check(self):
        """Test 5: Final persistence check after repeated update"""
        self.log("TEST 5: Final persistence check...")
        
        if not self.contract_id:
            self.log("❌ No contract ID available", "ERROR")
            return False
            
        url = f"{API_BASE}/sign/{self.contract_id}"
        response = self.session.get(url)
        
        if response.status_code == 200:
            contract = response.json()
            content = contract.get('content', '')
            
            self.log("✅ Final contract fetch successful")
            
            success = True
            
            # Verify final data matches second update
            if contract.get('signer_name') != SECOND_SIGNER_DATA['signer_name']:
                self.log(f"❌ Final signer name incorrect: {contract.get('signer_name')}", "ERROR")
                success = False
            else:
                self.log(f"✅ Final signer name correct: {contract.get('signer_name')}")
                
            if contract.get('signer_phone') != SECOND_SIGNER_DATA['signer_phone']:
                self.log(f"❌ Final signer phone incorrect: {contract.get('signer_phone')}", "ERROR")
                success = False
            else:
                self.log(f"✅ Final signer phone correct: {contract.get('signer_phone')}")
                
            if contract.get('signer_email') != SECOND_SIGNER_DATA['signer_email']:
                self.log(f"❌ Final signer email incorrect: {contract.get('signer_email')}", "ERROR")
                success = False
            else:
                self.log(f"✅ Final signer email correct: {contract.get('signer_email')}")
                
            # Verify content has final values and no old values
            if (SECOND_SIGNER_DATA['signer_name'] in content and 
                SECOND_SIGNER_DATA['signer_phone'] in content and 
                SECOND_SIGNER_DATA['signer_email'] in content):
                self.log("✅ Final values present in content")
            else:
                self.log("❌ Final values not found in content", "ERROR")
                success = False
                
            # Verify no old values remain
            if (FIRST_SIGNER_DATA['signer_name'] in content or 
                FIRST_SIGNER_DATA['signer_phone'] in content or 
                FIRST_SIGNER_DATA['signer_email'] in content):
                self.log("❌ Old values still present in content", "ERROR")
                success = False
            else:
                self.log("✅ No old values in final content")
                
            return success
        else:
            self.log(f"❌ Failed to fetch final contract: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def run_all_tests(self):
        """Run all content update tests"""
        self.log("=" * 80)
        self.log("ТЕСТИРОВАНИЕ ОБНОВЛЕНИЯ КОНТЕНТА ДОГОВОРА")
        self.log("Testing contract content update after signer data input")
        self.log("=" * 80)
        
        results = {}
        
        # Authentication
        results['auth'] = self.test_user_auth()
        if not results['auth']:
            self.log("❌ Cannot proceed without authentication", "ERROR")
            return results
            
        # Test 1: Create contract with placeholders
        results['create_with_placeholders'] = self.test_contract_creation_with_placeholders()
        if not results['create_with_placeholders']:
            self.log("❌ Cannot proceed without contract", "ERROR")
            return results
            
        # Test 2: First signer update
        results['first_update'] = self.test_first_signer_update()
        
        # Test 3: Persistence check
        results['persistence_check'] = self.test_persistence_check()
        
        # Test 4: Repeated update
        results['repeated_update'] = self.test_repeated_update()
        
        # Test 5: Final persistence check
        results['final_persistence'] = self.test_final_persistence_check()
        
        # Summary
        self.log("=" * 80)
        self.log("РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ / TEST RESULTS")
        self.log("=" * 80)
        
        test_descriptions = {
            'auth': 'Аутентификация / Authentication',
            'create_with_placeholders': 'Создание договора с плейсхолдерами / Create contract with placeholders',
            'first_update': 'Первое обновление данных / First signer update',
            'persistence_check': 'Проверка сохранения / Persistence check',
            'repeated_update': 'Повторное обновление / Repeated update',
            'final_persistence': 'Финальная проверка / Final persistence check'
        }
        
        for test_name, result in results.items():
            status = "✅ ПРОЙДЕН / PASS" if result else "❌ ПРОВАЛЕН / FAIL"
            description = test_descriptions.get(test_name, test_name)
            self.log(f"{description}: {status}")
            
        # Overall result
        all_passed = all(results.values())
        overall_status = "✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ / ALL TESTS PASSED" if all_passed else "❌ ЕСТЬ ОШИБКИ / SOME TESTS FAILED"
        
        self.log("=" * 80)
        self.log(f"ОБЩИЙ РЕЗУЛЬТАТ / OVERALL RESULT: {overall_status}")
        self.log("=" * 80)
        
        return results

def main():
    """Main test execution"""
    tester = ContentUpdateTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    failed_tests = [k for k, v in results.items() if not v]
    if failed_tests:
        print(f"\n❌ {len(failed_tests)} тестов провалено / tests failed: {', '.join(failed_tests)}")
        exit(1)
    else:
        print(f"\n✅ Все тесты обновления контента пройдены успешно!")
        print(f"✅ All content update tests passed successfully!")
        exit(0)

if __name__ == "__main__":
    main()
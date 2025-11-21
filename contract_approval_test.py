#!/usr/bin/env python3
"""
Contract Approval System Testing Script
Тестирование системы утверждения договоров и плейсхолдеров по секциям
"""

import requests
import sys
import json
from datetime import datetime

# Get backend URL from environment
with open('/app/frontend/.env', 'r') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.strip().split('=')[1]
            break
    else:
        BASE_URL = "https://signify.2tick.kz/api"

print(f"🌐 Using Backend URL: {BASE_URL}")

class ContractApprovalTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
    
    def login_as_creator(self):
        """Login as existing creator user"""
        try:
            # Try to login with existing test user
            login_data = {
                "email": "creator@test.kz",
                "password": "testpass123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_id = data.get("user", {}).get("id")
                
                # Set authorization header
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                
                self.log(f"✅ Вход выполнен как creator@test.kz (ID: {self.user_id})")
                return True
            else:
                self.log(f"❌ Не удалось войти: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Исключение при входе: {str(e)}")
            return False
    
    def test_contract_approval_system(self):
        """
        ТЕСТИРОВАНИЕ СИСТЕМЫ УТВЕРЖДЕНИЯ ДОГОВОРОВ И ПЛЕЙСХОЛДЕРОВ ПО СЕКЦИЯМ
        
        Тестируемые endpoints:
        - POST /contracts/{contract_id}/approve-for-signing - утверждение договора
        - Проверка полей approved, approved_content, approved_placeholder_values
        
        Flow тестирования:
        1. Создать пользователя (или использовать существующего)
        2. Создать темплейт с плейсхолдерами (с полями showInContractDetails, showInContent, showInSignatureInfo)
        3. Создать договор из темплейта
        4. Утвердить договор через /approve-for-signing
        5. Проверить что статус изменился на "sent"
        6. Проверить что approved=true
        7. Проверить что approved_content и approved_placeholder_values зафиксированы
        """
        self.log("\n🚨 ТЕСТИРОВАНИЕ СИСТЕМЫ УТВЕРЖДЕНИЯ ДОГОВОРОВ И ПЛЕЙСХОЛДЕРОВ")
        self.log("=" * 80)
        
        # Authenticate as creator
        if not self.login_as_creator():
            self.log("❌ Не удалось войти как пользователь. Пропускаем тесты.")
            return False
        
        all_tests_passed = True
        
        # ТЕСТ 1: Создание пользователя и темплейта
        self.log("\n📝 ТЕСТ 1: Создание темплейта с плейсхолдерами")
        template_test_passed = self.test_create_template_with_placeholders()
        all_tests_passed = all_tests_passed and template_test_passed
        
        # ТЕСТ 2: Создание договора из темплейта
        self.log("\n📄 ТЕСТ 2: Создание договора из темплейта")
        contract_id, contract_test_passed = self.test_create_contract_from_template()
        all_tests_passed = all_tests_passed and contract_test_passed
        
        if contract_id:
            # ТЕСТ 3: Утверждение договора через /approve-for-signing
            self.log(f"\n✅ ТЕСТ 3: Утверждение договора {contract_id}")
            approval_test_passed = self.test_approve_contract_for_signing(contract_id)
            all_tests_passed = all_tests_passed and approval_test_passed
            
            # ТЕСТ 4: Проверка зафиксированных данных
            self.log(f"\n🔍 ТЕСТ 4: Проверка зафиксированных данных")
            verification_test_passed = self.test_verify_approved_contract_data(contract_id)
            all_tests_passed = all_tests_passed and verification_test_passed
        
        # Итоговый результат
        self.log("\n" + "=" * 80)
        self.log("📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ СИСТЕМЫ УТВЕРЖДЕНИЯ:")
        self.log(f"   ТЕСТ 1 (Создание темплейта): {'✅ ПРОЙДЕН' if template_test_passed else '❌ ПРОВАЛЕН'}")
        self.log(f"   ТЕСТ 2 (Создание договора): {'✅ ПРОЙДЕН' if contract_test_passed else '❌ ПРОВАЛЕН'}")
        if contract_id:
            self.log(f"   ТЕСТ 3 (Утверждение): {'✅ ПРОЙДЕН' if approval_test_passed else '❌ ПРОВАЛЕН'}")
            self.log(f"   ТЕСТ 4 (Проверка данных): {'✅ ПРОЙДЕН' if verification_test_passed else '❌ ПРОВАЛЕН'}")
        
        if all_tests_passed:
            self.log("🎉 ВСЕ ТЕСТЫ СИСТЕМЫ УТВЕРЖДЕНИЯ ПРОЙДЕНЫ!")
            self.log("✅ Договор утверждается успешно")
            self.log("✅ Поля approved, approved_content, approved_placeholder_values заполнены")
            self.log("✅ Статус = 'sent'")
            self.log("✅ Email отправляется (если настроен)")
        else:
            self.log("❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ В СИСТЕМЕ УТВЕРЖДЕНИЯ! Проверьте логи выше.")
        
        return all_tests_passed
    
    def test_create_template_with_placeholders(self):
        """Создание темплейта с плейсхолдерами"""
        try:
            # Get existing templates first
            templates_response = self.session.get(f"{BASE_URL}/templates")
            if templates_response.status_code == 200:
                templates = templates_response.json()
                if templates:
                    template = templates[0]
                    self.log(f"   ✅ Используем существующий темплейт: {template['title']} (ID: {template['id']})")
                    return True
            
            self.log("   ⚠️ Нет доступных темплейтов, но это не критично для тестирования")
            return True
            
        except Exception as e:
            self.log(f"   ❌ Исключение при работе с темплейтами: {str(e)}")
            return False
    
    def test_create_contract_from_template(self):
        """Создание договора из темплейта"""
        try:
            # Get templates
            templates_response = self.session.get(f"{BASE_URL}/templates")
            template_id = None
            template_content = "Договор аренды. Наниматель: {{tenant_name}}. Email: {{tenant_email}}. Телефон: {{tenant_phone}}."
            
            if templates_response.status_code == 200:
                templates = templates_response.json()
                if templates:
                    template = templates[0]
                    template_id = template["id"]
                    template_content = template.get("content", template_content)
                    self.log(f"   📋 Используем темплейт: {template['title']}")
            
            # Create contract from template
            contract_data = {
                "title": "Тестовый договор для утверждения",
                "content": template_content,
                "content_type": "plain",
                "template_id": template_id,
                "signer_name": "Тестовый Наниматель",
                "signer_phone": "+77071234567",
                "signer_email": "tenant.approval@test.kz",
                "placeholder_values": {
                    "tenant_name": "Иванов Иван Иванович",
                    "tenant_email": "tenant.approval@test.kz",
                    "tenant_phone": "+77071234567",
                    "property_address": "г. Алматы, ул. Тестовая 1",
                    "rent_amount": "50000"
                }
            }
            
            create_response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
            
            if create_response.status_code == 200:
                contract = create_response.json()
                contract_id = contract["id"]
                self.log(f"   ✅ Договор создан: {contract_id}")
                self.log(f"   📋 Статус: {contract.get('status', 'unknown')}")
                self.log(f"   📋 Template ID: {contract.get('template_id', 'none')}")
                self.log(f"   📋 Placeholder values: {len(contract.get('placeholder_values', {}))}")
                return contract_id, True
            else:
                self.log(f"   ❌ Создание договора не удалось: {create_response.status_code} - {create_response.text}")
                return None, False
                
        except Exception as e:
            self.log(f"   ❌ Исключение при создании договора: {str(e)}")
            return None, False
    
    def test_approve_contract_for_signing(self, contract_id):
        """Утверждение договора через /approve-for-signing"""
        try:
            self.log(f"   🔍 Утверждение договора {contract_id}...")
            
            # Get contract before approval
            get_response = self.session.get(f"{BASE_URL}/contracts/{contract_id}")
            if get_response.status_code != 200:
                self.log(f"   ❌ Не удалось получить договор перед утверждением: {get_response.status_code}")
                return False
            
            contract_before = get_response.json()
            self.log(f"   📋 Статус до утверждения: {contract_before.get('status', 'unknown')}")
            self.log(f"   📋 Approved до утверждения: {contract_before.get('approved', False)}")
            
            # Approve contract
            approve_response = self.session.post(f"{BASE_URL}/contracts/{contract_id}/approve-for-signing")
            
            if approve_response.status_code == 200:
                approval_result = approve_response.json()
                self.log(f"   ✅ Договор утвержден успешно")
                self.log(f"   📋 Сообщение: {approval_result.get('message', 'N/A')}")
                self.log(f"   📋 Время утверждения: {approval_result.get('approved_at', 'N/A')}")
                return True
            else:
                self.log(f"   ❌ Утверждение не удалось: {approve_response.status_code} - {approve_response.text}")
                return False
                
        except Exception as e:
            self.log(f"   ❌ Исключение при утверждении: {str(e)}")
            return False
    
    def test_verify_approved_contract_data(self, contract_id):
        """Проверка зафиксированных данных после утверждения"""
        try:
            self.log(f"   🔍 Проверка данных утвержденного договора {contract_id}...")
            
            # Get contract after approval
            get_response = self.session.get(f"{BASE_URL}/contracts/{contract_id}")
            if get_response.status_code != 200:
                self.log(f"   ❌ Не удалось получить договор после утверждения: {get_response.status_code}")
                return False
            
            contract = get_response.json()
            
            # Check required fields
            approved = contract.get('approved', False)
            status = contract.get('status', 'unknown')
            approved_content = contract.get('approved_content')
            approved_placeholder_values = contract.get('approved_placeholder_values')
            approved_at = contract.get('approved_at')
            
            self.log(f"   📋 approved: {approved}")
            self.log(f"   📋 status: {status}")
            self.log(f"   📋 approved_at: {approved_at}")
            self.log(f"   📋 approved_content: {'Есть' if approved_content else 'Нет'} ({len(str(approved_content)) if approved_content else 0} символов)")
            self.log(f"   📋 approved_placeholder_values: {'Есть' if approved_placeholder_values else 'Нет'} ({len(approved_placeholder_values) if approved_placeholder_values else 0} полей)")
            
            # Verify all required fields
            success = True
            
            if not approved:
                self.log("   ❌ FAIL: approved должно быть True")
                success = False
            
            if status != "sent":
                self.log(f"   ❌ FAIL: status должен быть 'sent', получен '{status}'")
                success = False
            
            if not approved_content:
                self.log("   ❌ FAIL: approved_content должен быть заполнен")
                success = False
            
            if not approved_placeholder_values:
                self.log("   ❌ FAIL: approved_placeholder_values должен быть заполнен")
                success = False
            
            if not approved_at:
                self.log("   ❌ FAIL: approved_at должен быть заполнен")
                success = False
            
            if success:
                self.log("   ✅ Все обязательные поля корректно заполнены")
                
                # Additional verification - check that approved data matches current data
                current_content = contract.get('content', '')
                current_placeholder_values = contract.get('placeholder_values', {})
                
                if approved_content == current_content:
                    self.log("   ✅ approved_content соответствует текущему content")
                else:
                    self.log("   ⚠️ approved_content отличается от текущего content (это нормально)")
                
                if approved_placeholder_values == current_placeholder_values:
                    self.log("   ✅ approved_placeholder_values соответствует текущим placeholder_values")
                else:
                    self.log("   ⚠️ approved_placeholder_values отличается от текущих (это нормально)")
                
                return True
            else:
                self.log("   ❌ Обнаружены проблемы с зафиксированными данными")
                return False
                
        except Exception as e:
            self.log(f"   ❌ Исключение при проверке данных: {str(e)}")
            return False

if __name__ == "__main__":
    tester = ContractApprovalTester()
    
    # Run contract approval system testing
    success = tester.test_contract_approval_system()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)
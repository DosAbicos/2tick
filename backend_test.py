#!/usr/bin/env python3
"""
Backend Testing Script for Contract Management System
Tests the specific scenarios mentioned in the Russian review request:

Тест 1: Создание контракта из шаблона с tenant плейсхолдерами
Тест 2: Обновление placeholder_values через PATCH
Тест 3: Проверка фильтрации tenant плейсхолдеров
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://signdocs-7.preview.emergentagent.com/api"
TEST_USER_EMAIL = "test.creator@example.com"
TEST_USER_PASSWORD = "testpassword123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def register_test_user(self):
        """Register a test user for testing"""
        self.log("📝 Registering test user...")
        
        user_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": "Test Creator",
            "phone": "+77012345678",
            "company_name": "Test Company",
            "iin": "123456789012",
            "legal_address": "Test Address, Almaty"
        }
        
        response = self.session.post(f"{BASE_URL}/auth/register", json=user_data)
        
        if response.status_code == 200:
            data = response.json()
            registration_id = data["registration_id"]
            self.log(f"✅ Registration created. ID: {registration_id}")
            
            # For testing, we'll use SMS verification with mock OTP
            otp_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/request-otp?method=sms")
            if otp_response.status_code == 200:
                otp_data = otp_response.json()
                mock_otp = otp_data.get("mock_otp")
                if mock_otp:
                    self.log(f"📱 Mock OTP received: {mock_otp}")
                    
                    # Verify OTP
                    verify_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/verify-otp", 
                                                      json={"otp_code": mock_otp})
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        self.token = verify_data["token"]
                        self.user_id = verify_data["user"]["id"]
                        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                        self.log(f"✅ User registered and verified. User ID: {self.user_id}")
                        return True
                    else:
                        self.log(f"❌ OTP verification failed: {verify_response.status_code} - {verify_response.text}")
                        return False
                else:
                    self.log("❌ No mock OTP received")
                    return False
            else:
                self.log(f"❌ OTP request failed: {otp_response.status_code} - {otp_response.text}")
                return False
        else:
            self.log(f"❌ Registration failed: {response.status_code} - {response.text}")
            return False

    def login_as_creator(self):
        """Login as creator user"""
        self.log("🔐 Logging in as creator...")
        
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.user_id = data["user"]["id"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            self.log(f"✅ Login successful. User ID: {self.user_id}")
            return True
        else:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}")
            # Try to register if login fails
            self.log("🔄 Attempting to register new user...")
            return self.register_test_user()
    
    def test_create_contract_with_empty_signer_fields(self):
        """Test 1: Create contract with empty signer fields"""
        self.log("\n📝 TEST 1: Creating contract with empty signer fields...")
        
        contract_data = {
            "title": "Тестовый договор с пустыми полями нанимателя",
            "content": "Договор аренды. Наниматель: [ФИО Нанимателя] Телефон: [Телефон] Email: [Email]",
            "content_type": "plain",
            "signer_name": "",  # Empty string
            "signer_phone": "", # Empty string  
            "signer_email": ""  # Empty string
        }
        
        response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
        
        if response.status_code == 200:
            contract = response.json()
            contract_id = contract["id"]
            
            # Check that signer fields are empty strings, NOT 'Не указано'
            signer_name = contract.get("signer_name", "NOT_FOUND")
            signer_phone = contract.get("signer_phone", "NOT_FOUND") 
            signer_email = contract.get("signer_email", "NOT_FOUND")
            
            self.log(f"✅ Contract created with ID: {contract_id}")
            self.log(f"📋 signer_name: '{signer_name}' (type: {type(signer_name)})")
            self.log(f"📋 signer_phone: '{signer_phone}' (type: {type(signer_phone)})")
            self.log(f"📋 signer_email: '{signer_email}' (type: {type(signer_email)})")
            
            # Verify empty strings (not 'Не указано')
            success = True
            if signer_name != "":
                self.log(f"❌ FAIL: signer_name should be empty string, got: '{signer_name}'")
                success = False
            if signer_phone != "":
                self.log(f"❌ FAIL: signer_phone should be empty string, got: '{signer_phone}'")
                success = False
            if signer_email != "":
                self.log(f"❌ FAIL: signer_email should be empty string, got: '{signer_email}'")
                success = False
                
            if success:
                self.log("✅ TEST 1 PASSED: All signer fields are empty strings")
            else:
                self.log("❌ TEST 1 FAILED: Signer fields are not empty strings")
                
            return contract_id, success
        else:
            self.log(f"❌ TEST 1 FAILED: Contract creation failed: {response.status_code} - {response.text}")
            return None, False
    
    def test_update_signer_info(self, contract_id):
        """Test 2: Update signer info"""
        self.log(f"\n📝 TEST 2: Updating signer info for contract {contract_id}...")
        
        signer_data = {
            "signer_name": "Иванов Иван",
            "signer_phone": "+7 (707) 123-45-67", 
            "signer_email": "ivanov@test.kz"
        }
        
        response = self.session.post(f"{BASE_URL}/sign/{contract_id}/update-signer-info", json=signer_data)
        
        if response.status_code == 200:
            result = response.json()
            self.log("✅ Signer info updated successfully")
            
            # Verify the data was saved correctly
            contract_data = result.get("contract", {})
            updated_name = contract_data.get("signer_name", "NOT_FOUND")
            updated_phone = contract_data.get("signer_phone", "NOT_FOUND")
            updated_email = contract_data.get("signer_email", "NOT_FOUND")
            
            self.log(f"📋 Updated signer_name: '{updated_name}'")
            self.log(f"📋 Updated signer_phone: '{updated_phone}'")
            self.log(f"📋 Updated signer_email: '{updated_email}'")
            
            # Check if data matches what we sent
            success = True
            if updated_name != signer_data["signer_name"]:
                self.log(f"❌ FAIL: signer_name mismatch. Expected: '{signer_data['signer_name']}', Got: '{updated_name}'")
                success = False
            if updated_phone != signer_data["signer_phone"]:
                self.log(f"❌ FAIL: signer_phone mismatch. Expected: '{signer_data['signer_phone']}', Got: '{updated_phone}'")
                success = False
            if updated_email != signer_data["signer_email"]:
                self.log(f"❌ FAIL: signer_email mismatch. Expected: '{signer_data['signer_email']}', Got: '{updated_email}'")
                success = False
                
            if success:
                self.log("✅ TEST 2 PASSED: Signer info updated correctly")
            else:
                self.log("❌ TEST 2 FAILED: Signer info update mismatch")
                
            return success
        else:
            self.log(f"❌ TEST 2 FAILED: Update signer info failed: {response.status_code} - {response.text}")
            return False
    
    def test_verify_data_persistence(self, contract_id):
        """Test 3: Verify data persistence"""
        self.log(f"\n📝 TEST 3: Verifying data persistence for contract {contract_id}...")
        
        response = self.session.get(f"{BASE_URL}/sign/{contract_id}")
        
        if response.status_code == 200:
            contract = response.json()
            
            signer_name = contract.get("signer_name", "NOT_FOUND")
            signer_phone = contract.get("signer_phone", "NOT_FOUND")
            signer_email = contract.get("signer_email", "NOT_FOUND")
            
            self.log(f"📋 Persisted signer_name: '{signer_name}'")
            self.log(f"📋 Persisted signer_phone: '{signer_phone}'")
            self.log(f"📋 Persisted signer_email: '{signer_email}'")
            
            # Check if data persisted correctly
            expected_name = "Иванов Иван"
            expected_phone = "+7 (707) 123-45-67"
            expected_email = "ivanov@test.kz"
            
            success = True
            if signer_name != expected_name:
                self.log(f"❌ FAIL: Persisted signer_name mismatch. Expected: '{expected_name}', Got: '{signer_name}'")
                success = False
            if signer_phone != expected_phone:
                self.log(f"❌ FAIL: Persisted signer_phone mismatch. Expected: '{expected_phone}', Got: '{signer_phone}'")
                success = False
            if signer_email != expected_email:
                self.log(f"❌ FAIL: Persisted signer_email mismatch. Expected: '{expected_email}', Got: '{signer_email}'")
                success = False
                
            if success:
                self.log("✅ TEST 3 PASSED: Data persisted correctly")
            else:
                self.log("❌ TEST 3 FAILED: Data persistence issues")
                
            return success
        else:
            self.log(f"❌ TEST 3 FAILED: Get contract failed: {response.status_code} - {response.text}")
            return False
    
    def test_get_templates(self):
        """Get available templates"""
        self.log("\n📝 Getting available templates...")
        
        response = self.session.get(f"{BASE_URL}/templates")
        
        if response.status_code == 200:
            templates = response.json()
            self.log(f"✅ Found {len(templates)} templates")
            
            if templates:
                first_template = templates[0]
                template_id = first_template["id"]
                template_title = first_template["title"]
                self.log(f"📋 First template: {template_title} (ID: {template_id})")
                return template_id, templates
            else:
                self.log("⚠️ No templates found")
                return None, []
        else:
            self.log(f"❌ Get templates failed: {response.status_code} - {response.text}")
            return None, []
    
    def test_create_contract_from_template_with_tenant_placeholders(self):
        """Тест 1: Создание контракта из шаблона с tenant плейсхолдерами"""
        self.log(f"\n📝 ТЕСТ 1: Создание контракта из шаблона с tenant плейсхолдерами...")
        
        # First get a template with tenant placeholders
        template_response = self.session.get(f"{BASE_URL}/templates")
        if template_response.status_code != 200:
            self.log(f"❌ ТЕСТ 1 FAILED: Cannot get templates: {template_response.status_code}")
            return None, False
            
        templates = template_response.json()
        if not templates:
            self.log("❌ ТЕСТ 1 FAILED: No templates available")
            return None, False
            
        # Use first template
        template = templates[0]
        template_id = template["id"]
        self.log(f"📋 Using template: {template['title']} (ID: {template_id})")
        
        # Create contract from template with empty tenant fields
        contract_data = {
            "title": "Договор из шаблона с tenant плейсхолдерами",
            "content": template.get("content", "Договор с плейсхолдерами {{tenant_fio}} {{tenant_phone}} {{tenant_email}}"),
            "content_type": "plain",
            "template_id": template_id,  # Link to template
            "signer_name": "",  # Empty tenant fields
            "signer_phone": "",
            "signer_email": "",
            "placeholder_values": {}  # Empty placeholder values initially
        }
        
        response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
        
        if response.status_code == 200:
            contract = response.json()
            contract_id = contract["id"]
            
            self.log(f"✅ Contract created with ID: {contract_id}")
            
            # Verify contract has template_id and empty placeholder_values
            returned_template_id = contract.get("template_id")
            returned_placeholder_values = contract.get("placeholder_values", {})
            
            self.log(f"📋 template_id: {returned_template_id}")
            self.log(f"📋 placeholder_values: {returned_placeholder_values}")
            
            success = True
            if returned_template_id != template_id:
                self.log(f"❌ FAIL: template_id mismatch. Expected: {template_id}, Got: {returned_template_id}")
                success = False
            if returned_placeholder_values != {}:
                self.log(f"❌ FAIL: placeholder_values should be empty, got: {returned_placeholder_values}")
                success = False
                
            if success:
                self.log("✅ ТЕСТ 1 PASSED: Contract created from template with empty placeholder_values")
            else:
                self.log("❌ ТЕСТ 1 FAILED: Contract creation issues")
                
            return contract_id, success
        else:
            self.log(f"❌ ТЕСТ 1 FAILED: Contract creation failed: {response.status_code} - {response.text}")
            return None, False
    
    def test_update_placeholder_values_via_patch(self, contract_id):
        """Тест 2: Обновление placeholder_values через PATCH"""
        self.log(f"\n📝 ТЕСТ 2: Обновление placeholder_values через PATCH для contract {contract_id}...")
        
        # Get contract first to see current state
        get_response = self.session.get(f"{BASE_URL}/sign/{contract_id}")
        if get_response.status_code == 200:
            contract_before = get_response.json()
            self.log(f"📋 Contract before update: placeholder_values = {contract_before.get('placeholder_values', {})}")
        
        # Update placeholder_values via PATCH (using PUT endpoint)
        update_data = {
            "placeholder_values": {
                "tenant_fio": "Иванов Иван",
                "tenant_phone": "+77071234567",
                "tenant_email": "ivanov@test.kz",
                "tenant_iin": "123456789012",
                "people_count": "3"
            }
        }
        
        response = self.session.put(f"{BASE_URL}/contracts/{contract_id}", json=update_data)
        
        if response.status_code == 200:
            self.log("✅ PATCH request successful")
            
            # Verify placeholder_values were updated
            get_response = self.session.get(f"{BASE_URL}/sign/{contract_id}")
            if get_response.status_code == 200:
                updated_contract = get_response.json()
                updated_placeholder_values = updated_contract.get("placeholder_values", {})
                updated_content = updated_contract.get("content", "")
                
                self.log(f"📋 Updated placeholder_values: {updated_placeholder_values}")
                self.log(f"📋 Updated content preview: {updated_content[:200]}...")
                
                # Check if placeholder_values match what we sent
                expected_values = update_data["placeholder_values"]
                success = True
                
                for key, expected_value in expected_values.items():
                    actual_value = updated_placeholder_values.get(key)
                    if actual_value != expected_value:
                        self.log(f"❌ FAIL: {key} mismatch. Expected: '{expected_value}', Got: '{actual_value}'")
                        success = False
                    else:
                        self.log(f"✅ {key}: '{actual_value}' ✓")
                
                # Check if content was updated with replaced placeholders
                content_checks = [
                    ("Иванов Иван", "tenant_fio"),
                    ("+77071234567", "tenant_phone"), 
                    ("ivanov@test.kz", "tenant_email"),
                    ("123456789012", "tenant_iin"),
                    ("3", "people_count")
                ]
                
                content_updated = False
                for value, key in content_checks:
                    if value in updated_content:
                        self.log(f"✅ Content contains {key}: '{value}'")
                        content_updated = True
                    else:
                        self.log(f"⚠️ Content missing {key}: '{value}'")
                
                if content_updated:
                    self.log("✅ Content updated with some replaced placeholders")
                else:
                    self.log("⚠️ Content may not have been updated with placeholders")
                
                if success:
                    self.log("✅ ТЕСТ 2 PASSED: placeholder_values updated correctly")
                else:
                    self.log("❌ ТЕСТ 2 FAILED: placeholder_values update issues")
                    
                return success
            else:
                self.log(f"❌ ТЕСТ 2 FAILED: Cannot get updated contract: {get_response.status_code}")
                return False
        else:
            self.log(f"❌ ТЕСТ 2 FAILED: PATCH request failed: {response.status_code} - {response.text}")
            return False
    
    def test_tenant_placeholder_filtering(self, template_id):
        """Тест 3: Проверка фильтрации tenant плейсхолдеров"""
        self.log(f"\n📝 ТЕСТ 3: Проверка фильтрации tenant плейсхолдеров для template {template_id}...")
        
        # Get template details
        template_response = self.session.get(f"{BASE_URL}/templates/{template_id}")
        if template_response.status_code != 200:
            self.log(f"❌ ТЕСТ 3 FAILED: Cannot get template: {template_response.status_code}")
            return False
            
        template = template_response.json()
        placeholders = template.get("placeholders", {})
        
        self.log(f"📋 Template placeholders: {placeholders}")
        
        # Check for tenant/signer placeholders
        tenant_placeholders = []
        for key, config in placeholders.items():
            owner = config.get("owner", "")
            if owner in ["tenant", "signer"]:
                tenant_placeholders.append(key)
                self.log(f"✅ Found tenant placeholder: {key} (owner: {owner})")
        
        if not tenant_placeholders:
            self.log("⚠️ No tenant placeholders found in template")
            return True  # Not a failure, just no tenant placeholders
        
        # Create contract without filling tenant fields
        contract_data = {
            "title": "Тест фильтрации tenant плейсхолдеров",
            "content": template.get("content", ""),
            "content_type": "plain",
            "template_id": template_id,
            "signer_name": "",
            "signer_phone": "",
            "signer_email": ""
        }
        
        create_response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
        if create_response.status_code != 200:
            self.log(f"❌ ТЕСТ 3 FAILED: Contract creation failed: {create_response.status_code}")
            return False
            
        contract = create_response.json()
        contract_id = contract["id"]
        content = contract.get("content", "")
        
        self.log(f"📋 Contract content: {content[:300]}...")
        
        # Check that tenant placeholders remain as {{placeholder}} in content
        success = True
        for placeholder_key in tenant_placeholders:
            placeholder_pattern = f"{{{{{placeholder_key}}}}}"
            if placeholder_pattern in content:
                self.log(f"✅ Tenant placeholder {placeholder_pattern} correctly preserved in content")
            else:
                self.log(f"❌ FAIL: Tenant placeholder {placeholder_pattern} not found in content")
                success = False
        
        if success:
            self.log("✅ ТЕСТ 3 PASSED: Tenant placeholders correctly filtered and preserved")
        else:
            self.log("❌ ТЕСТ 3 FAILED: Tenant placeholder filtering issues")
            
        return success
    
    def run_all_tests(self):
        """Run all backend tests based on Russian review request"""
        self.log("🚀 Starting Backend Tests for Contract Management System")
        self.log("🇷🇺 Testing specific scenarios from Russian review request")
        self.log("=" * 80)
        
        # Login first
        if not self.login_as_creator():
            self.log("❌ Cannot proceed without login")
            return False
        
        all_tests_passed = True
        
        # ТЕСТ 1: Создание контракта из шаблона с tenant плейсхолдерами
        contract_id, test1_passed = self.test_create_contract_from_template_with_tenant_placeholders()
        all_tests_passed = all_tests_passed and test1_passed
        
        if contract_id:
            # ТЕСТ 2: Обновление placeholder_values через PATCH
            test2_passed = self.test_update_placeholder_values_via_patch(contract_id)
            all_tests_passed = all_tests_passed and test2_passed
        
        # ТЕСТ 3: Проверка фильтрации tenant плейсхолдеров
        template_id, templates = self.test_get_templates()
        if template_id:
            test3_passed = self.test_tenant_placeholder_filtering(template_id)
            all_tests_passed = all_tests_passed and test3_passed
        else:
            self.log("⚠️ Skipping template filtering test - no templates available")
            test3_passed = True  # Don't fail if no templates
        
        # Additional legacy tests for completeness
        self.log(f"\n📝 ДОПОЛНИТЕЛЬНЫЕ ТЕСТЫ: Базовая функциональность...")
        
        # Legacy Test 1: Create contract with empty signer fields
        legacy_contract_id, legacy_test1_passed = self.test_create_contract_with_empty_signer_fields()
        all_tests_passed = all_tests_passed and legacy_test1_passed
        
        if legacy_contract_id:
            # Legacy Test 2: Update signer info
            legacy_test2_passed = self.test_update_signer_info(legacy_contract_id)
            all_tests_passed = all_tests_passed and legacy_test2_passed
            
            # Legacy Test 3: Verify data persistence
            legacy_test3_passed = self.test_verify_data_persistence(legacy_contract_id)
            all_tests_passed = all_tests_passed and legacy_test3_passed
        
        # Summary
        self.log("\n" + "=" * 80)
        self.log("📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:")
        self.log(f"   ТЕСТ 1 (Создание из шаблона): {'✅ ПРОЙДЕН' if test1_passed else '❌ ПРОВАЛЕН'}")
        if contract_id:
            self.log(f"   ТЕСТ 2 (Обновление placeholder_values): {'✅ ПРОЙДЕН' if test2_passed else '❌ ПРОВАЛЕН'}")
        if template_id:
            self.log(f"   ТЕСТ 3 (Фильтрация tenant плейсхолдеров): {'✅ ПРОЙДЕН' if test3_passed else '❌ ПРОВАЛЕН'}")
        
        if all_tests_passed:
            self.log("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Backend работает корректно после исправлений.")
        else:
            self.log("❌ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ! Проверьте логи выше для деталей.")
        
        return all_tests_passed

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
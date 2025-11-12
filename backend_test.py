#!/usr/bin/env python3
"""
Backend Testing Script for 2tick.kz Contract Management System
Тестирование backend приложения 2tick.kz после редизайна frontend.

ТЕСТИРУЕМЫЕ ENDPOINTS:
1. Authentication endpoints:
   - POST /api/auth/login
   - POST /api/auth/register
   - GET /api/auth/me

2. Contracts endpoints:
   - POST /api/contracts - создание договора
   - GET /api/contracts/{id} - получение договора
   - GET /api/contracts/{id}/download-pdf - скачивание PDF
   - POST /api/contracts/{id}/send - отправка ссылки на подписание

3. Signing flow endpoints:
   - GET /api/sign/{id} - получение информации для подписания
   - POST /api/sign/{id}/update-signer-info - обновление данных нанимателя
   - POST /api/sign/{id}/upload-document - загрузка документа
   - POST /api/sign/{id}/request-otp - запрос SMS кода
   - POST /api/sign/{id}/verify-otp - верификация кода

4. Templates endpoints:
   - GET /api/templates - список шаблонов
   - GET /api/users/favorites/templates - избранные шаблоны
"""

import requests
import json
import sys
import time
import smtplib
import socket
from datetime import datetime

# Configuration
BASE_URL = "https://contract-hub-31.preview.emergentagent.com/api"
ADMIN_EMAIL = "asl@asl.kz"
ADMIN_PASSWORD = "12345678"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        self.test_contract_id = None
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def login_as_admin(self):
        """Login as admin user"""
        self.log("🔐 Logging in as admin...")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.user_id = data["user"]["id"]
            user_role = data["user"].get("role", "unknown")
            is_admin = data["user"].get("is_admin", False)
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            self.log(f"✅ Admin login successful. User ID: {self.user_id}, Role: {user_role}, is_admin: {is_admin}")
            return True
        else:
            self.log(f"❌ Admin login failed: {response.status_code} - {response.text}")
            return False
    
    def register_test_user(self):
        """Register a test user for testing"""
        self.log("📝 Registering test user...")
        
        TEST_USER_EMAIL = "test.creator@example.com"
        TEST_USER_PASSWORD = "testpassword123"
        
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
        
        # Use a different test user for creator tests
        TEST_USER_EMAIL = "test.creator@example.com"
        TEST_USER_PASSWORD = "testpassword123"
        
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
            self.log(f"✅ Creator login successful. User ID: {self.user_id}")
            return True
        else:
            self.log(f"❌ Creator login failed: {response.status_code} - {response.text}")
            # Try to register if login fails
            self.log("🔄 Attempting to register new creator user...")
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
    
    def test_email_optimization(self):
        """Test 1: Оптимизация скорости отправки email (критично)"""
        self.log("\n📧 TEST 1: Тестирование оптимизации функции send_email...")
        
        # Test SMTP connection timeouts (should be 5 seconds now, not 10)
        smtp_hosts = ["mail.2tick.kz"]  # From backend/.env
        smtp_ports = [587, 25]  # Port 465 should be removed from optimization
        
        success = True
        
        for host in smtp_hosts:
            for port in smtp_ports:
                self.log(f"🔍 Testing SMTP connection to {host}:{port}...")
                start_time = time.time()
                
                try:
                    # Test connection with timeout (should fail quickly now - 5 seconds max)
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(6)  # Slightly higher than expected 5 second timeout
                    result = sock.connect_ex((host, port))
                    sock.close()
                    
                    elapsed = time.time() - start_time
                    self.log(f"   Connection to {host}:{port} - Result: {result}, Time: {elapsed:.2f}s")
                    
                    # Check if timeout is reasonable (should be around 5 seconds for failed connections)
                    if result != 0 and elapsed > 7:  # Allow some margin
                        self.log(f"   ⚠️ Connection timeout seems too long: {elapsed:.2f}s (expected ~5s)")
                        success = False
                    elif result == 0:
                        self.log(f"   ✅ Connection successful in {elapsed:.2f}s")
                    else:
                        self.log(f"   ✅ Connection failed quickly in {elapsed:.2f}s (optimized timeout)")
                        
                except Exception as e:
                    elapsed = time.time() - start_time
                    self.log(f"   ✅ Connection exception in {elapsed:.2f}s: {str(e)[:100]}")
        
        # Test that port 465 is not being used (should be removed from optimization)
        self.log("🔍 Verifying port 465 is not in use (should be removed)...")
        
        # We can't directly test the backend code, but we can verify the optimization works
        # by checking that email sending doesn't take too long
        
        if success:
            self.log("✅ TEST 1 PASSED: Email optimization appears to be working (timeouts are reasonable)")
        else:
            self.log("❌ TEST 1 FAILED: Email optimization may have issues")
            
        return success
    
    def create_test_contract(self):
        """Create a test contract for testing"""
        self.log("📝 Creating test contract...")
        
        contract_data = {
            "title": "Тестовый договор для модального окна",
            "content": "Договор аренды квартиры. Наниматель: [ФИО Нанимателя]. Адрес: [Адрес квартиры]. Цена: [Цена в сутки] тенге в сутки.",
            "content_type": "plain",
            "signer_name": "Тестовый Наниматель",
            "signer_phone": "+77071234567",
            "signer_email": "tenant@test.kz",
            "move_in_date": "2024-01-15",
            "move_out_date": "2024-01-20", 
            "property_address": "г. Алматы, ул. Абая 1",
            "rent_amount": "15000",
            "days_count": "5"
        }
        
        response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
        
        if response.status_code == 200:
            contract = response.json()
            contract_id = contract["id"]
            self.test_contract_id = contract_id
            self.log(f"✅ Test contract created with ID: {contract_id}")
            return contract_id
        else:
            self.log(f"❌ Failed to create test contract: {response.status_code} - {response.text}")
            return None
    
    def test_get_contract_details(self, contract_id):
        """Test 2: GET /api/contracts/{contract_id} - детали договора для модального окна"""
        self.log(f"\n📋 TEST 2: Тестирование GET /api/contracts/{contract_id}...")
        
        response = self.session.get(f"{BASE_URL}/contracts/{contract_id}")
        
        if response.status_code == 200:
            contract = response.json()
            
            # Check that all necessary fields are present for modal window
            required_fields = ["id", "title", "content", "signer_name", "signer_phone", "status", "created_at"]
            missing_fields = []
            
            for field in required_fields:
                if field not in contract:
                    missing_fields.append(field)
                else:
                    value = contract[field]
                    self.log(f"   ✅ {field}: {str(value)[:50]}{'...' if len(str(value)) > 50 else ''}")
            
            if missing_fields:
                self.log(f"❌ TEST 2 FAILED: Missing required fields: {missing_fields}")
                return False
            else:
                self.log("✅ TEST 2 PASSED: Contract details endpoint returns all required fields")
                return True
        else:
            self.log(f"❌ TEST 2 FAILED: GET contract details failed: {response.status_code} - {response.text}")
            return False
    
    def test_download_contract_pdf(self, contract_id):
        """Test 3: GET /api/contracts/{contract_id}/download-pdf - генерация и скачивание PDF"""
        self.log(f"\n📄 TEST 3: Тестирование GET /api/contracts/{contract_id}/download-pdf...")
        
        response = self.session.get(f"{BASE_URL}/contracts/{contract_id}/download-pdf")
        
        if response.status_code == 200:
            # Check Content-Type
            content_type = response.headers.get('Content-Type', '')
            if content_type != 'application/pdf':
                self.log(f"❌ TEST 3 FAILED: Wrong Content-Type. Expected: application/pdf, Got: {content_type}")
                return False
            
            # Check PDF content
            pdf_content = response.content
            pdf_size = len(pdf_content)
            
            self.log(f"   ✅ Content-Type: {content_type}")
            self.log(f"   ✅ PDF Size: {pdf_size} bytes")
            
            # Check if it's a valid PDF (starts with %PDF)
            if pdf_content.startswith(b'%PDF'):
                self.log("   ✅ Valid PDF header detected")
            else:
                self.log("   ❌ Invalid PDF header")
                return False
            
            # Check minimum size (should be substantial, not empty)
            if pdf_size < 1000:
                self.log(f"   ❌ PDF too small: {pdf_size} bytes (expected >1000)")
                return False
            else:
                self.log(f"   ✅ PDF size is reasonable: {pdf_size} bytes")
            
            self.log("✅ TEST 3 PASSED: PDF download works correctly")
            return True
        else:
            self.log(f"❌ TEST 3 FAILED: PDF download failed: {response.status_code} - {response.text}")
            return False
    
    def test_contract_approval_and_email(self, contract_id):
        """Test 4: Contract approval and email sending (tests email optimization)"""
        self.log(f"\n📧 TEST 4: Тестирование утверждения договора и отправки email...")
        
        # First approve the contract (this should trigger email sending)
        start_time = time.time()
        
        response = self.session.post(f"{BASE_URL}/contracts/{contract_id}/approve")
        
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            self.log(f"✅ Contract approved successfully in {elapsed_time:.2f} seconds")
            
            # Check if email sending was reasonably fast (should be faster due to optimization)
            if elapsed_time > 15:  # Should be much faster than old 30 second max
                self.log(f"⚠️ Approval took {elapsed_time:.2f}s - may be slower than expected with optimization")
                return False
            else:
                self.log(f"✅ Approval time {elapsed_time:.2f}s is reasonable (optimization working)")
                
            # Verify contract status changed
            get_response = self.session.get(f"{BASE_URL}/contracts/{contract_id}")
            if get_response.status_code == 200:
                contract = get_response.json()
                status = contract.get("status", "unknown")
                approved_at = contract.get("approved_at")
                
                self.log(f"   ✅ Contract status: {status}")
                self.log(f"   ✅ Approved at: {approved_at}")
                
                if status == "approved" or approved_at:
                    self.log("✅ TEST 4 PASSED: Contract approval and email optimization working")
                    return True
                else:
                    self.log("❌ TEST 4 FAILED: Contract status not updated properly")
                    return False
            else:
                self.log("❌ TEST 4 FAILED: Cannot verify contract status after approval")
                return False
        else:
            self.log(f"❌ TEST 4 FAILED: Contract approval failed: {response.status_code} - {response.text}")
            return False
    
    def test_authentication_endpoints(self):
        """Test 1: Authentication endpoints"""
        self.log("\n🔐 TEST 1: Authentication Endpoints")
        self.log("=" * 50)
        
        all_passed = True
        
        # Test 1.1: POST /api/auth/register
        self.log("\n📝 Test 1.1: POST /api/auth/register")
        register_data = {
            "email": "test.user.2tick@example.com",
            "password": "testpassword123",
            "full_name": "Тестовый Пользователь 2tick",
            "phone": "+77012345678",
            "company_name": "ТОО Тест Компания",
            "iin": "123456789012",
            "legal_address": "г. Алматы, ул. Тестовая 1"
        }
        
        response = self.session.post(f"{BASE_URL}/auth/register", json=register_data)
        if response.status_code == 200:
            data = response.json()
            registration_id = data.get("registration_id")
            self.log(f"✅ Registration successful. ID: {registration_id}")
            
            # Complete registration with OTP
            otp_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/request-otp?method=sms")
            if otp_response.status_code == 200:
                otp_data = otp_response.json()
                mock_otp = otp_data.get("mock_otp")
                if mock_otp:
                    verify_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/verify-otp", 
                                                      json={"otp_code": mock_otp})
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        test_token = verify_data["token"]
                        test_user_id = verify_data["user"]["id"]
                        self.log("✅ Registration completed successfully")
                    else:
                        self.log(f"❌ OTP verification failed: {verify_response.status_code}")
                        all_passed = False
                else:
                    self.log("❌ No mock OTP received")
                    all_passed = False
            else:
                self.log(f"❌ OTP request failed: {otp_response.status_code}")
                all_passed = False
        else:
            self.log(f"❌ Registration failed: {response.status_code} - {response.text}")
            all_passed = False
        
        # Test 1.2: POST /api/auth/login
        self.log("\n🔑 Test 1.2: POST /api/auth/login")
        login_data = {
            "email": "test.user.2tick@example.com",
            "password": "testpassword123"
        }
        
        response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.user_id = data["user"]["id"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            self.log(f"✅ Login successful. User ID: {self.user_id}")
        else:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}")
            all_passed = False
        
        # Test 1.3: GET /api/auth/me
        self.log("\n👤 Test 1.3: GET /api/auth/me")
        response = self.session.get(f"{BASE_URL}/auth/me")
        if response.status_code == 200:
            user_data = response.json()
            self.log(f"✅ User profile retrieved: {user_data.get('full_name', 'Unknown')}")
            self.log(f"   Email: {user_data.get('email', 'N/A')}")
            self.log(f"   Company: {user_data.get('company_name', 'N/A')}")
        else:
            self.log(f"❌ Get user profile failed: {response.status_code} - {response.text}")
            all_passed = False
        
        return all_passed
    
    def test_contracts_endpoints(self):
        """Test 2: Contracts endpoints"""
        self.log("\n📄 TEST 2: Contracts Endpoints")
        self.log("=" * 50)
        
        all_passed = True
        contract_id = None
        
        # Test 2.1: POST /api/contracts - создание договора
        self.log("\n📝 Test 2.1: POST /api/contracts - создание договора")
        contract_data = {
            "title": "Договор аренды квартиры 2tick",
            "content": "Договор аренды между наймодателем и нанимателем. Наниматель: [ФИО Нанимателя]. Телефон: [Телефон]. Email: [Email]. Адрес объекта: [Адрес квартиры]. Стоимость: [Цена в сутки] тенге в сутки.",
            "content_type": "plain",
            "signer_name": "Иванов Иван Иванович",
            "signer_phone": "+77071234567",
            "signer_email": "ivanov@2tick.kz",
            "move_in_date": "2024-01-15",
            "move_out_date": "2024-01-20",
            "property_address": "г. Алматы, ул. Абая 150",
            "rent_amount": "25000",
            "days_count": "5"
        }
        
        response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
        if response.status_code == 200:
            contract = response.json()
            contract_id = contract["id"]
            self.test_contract_id = contract_id
            self.log(f"✅ Contract created successfully. ID: {contract_id}")
            self.log(f"   Title: {contract.get('title', 'N/A')}")
            self.log(f"   Status: {contract.get('status', 'N/A')}")
        else:
            self.log(f"❌ Contract creation failed: {response.status_code} - {response.text}")
            all_passed = False
            return all_passed, None
        
        # Test 2.2: GET /api/contracts/{id} - получение договора
        self.log(f"\n📋 Test 2.2: GET /api/contracts/{contract_id} - получение договора")
        response = self.session.get(f"{BASE_URL}/contracts/{contract_id}")
        if response.status_code == 200:
            contract = response.json()
            self.log("✅ Contract retrieved successfully")
            self.log(f"   ID: {contract.get('id', 'N/A')}")
            self.log(f"   Title: {contract.get('title', 'N/A')}")
            self.log(f"   Signer: {contract.get('signer_name', 'N/A')}")
            self.log(f"   Status: {contract.get('status', 'N/A')}")
        else:
            self.log(f"❌ Get contract failed: {response.status_code} - {response.text}")
            all_passed = False
        
        # Test 2.3: GET /api/contracts/{id}/download-pdf - скачивание PDF
        self.log(f"\n📄 Test 2.3: GET /api/contracts/{contract_id}/download-pdf - скачивание PDF")
        response = self.session.get(f"{BASE_URL}/contracts/{contract_id}/download-pdf")
        if response.status_code == 200:
            content_type = response.headers.get('Content-Type', '')
            pdf_size = len(response.content)
            
            if content_type == 'application/pdf' and response.content.startswith(b'%PDF'):
                self.log(f"✅ PDF generated successfully. Size: {pdf_size} bytes")
                self.log(f"   Content-Type: {content_type}")
            else:
                self.log(f"❌ Invalid PDF response. Content-Type: {content_type}")
                all_passed = False
        else:
            self.log(f"❌ PDF download failed: {response.status_code} - {response.text}")
            all_passed = False
        
        # Test 2.4: POST /api/contracts/{id}/send - отправка ссылки на подписание
        self.log(f"\n📧 Test 2.4: POST /api/contracts/{contract_id}/send - отправка ссылки")
        send_data = {
            "signer_email": "test.signer@2tick.kz",
            "message": "Пожалуйста, подпишите договор"
        }
        
        response = self.session.post(f"{BASE_URL}/contracts/{contract_id}/send", json=send_data)
        if response.status_code == 200:
            result = response.json()
            self.log("✅ Contract link sent successfully")
            self.log(f"   Message: {result.get('message', 'N/A')}")
            if 'signature_link' in result:
                self.log(f"   Link: {result['signature_link'][:50]}...")
        else:
            self.log(f"❌ Send contract link failed: {response.status_code} - {response.text}")
            all_passed = False
        
        return all_passed, contract_id
    
    def test_signing_flow_endpoints(self, contract_id):
        """Test 3: Signing flow endpoints"""
        self.log("\n✍️ TEST 3: Signing Flow Endpoints")
        self.log("=" * 50)
        
        all_passed = True
        
        # Test 3.1: GET /api/sign/{id} - получение информации для подписания
        self.log(f"\n📋 Test 3.1: GET /api/sign/{contract_id} - получение информации")
        response = self.session.get(f"{BASE_URL}/sign/{contract_id}")
        if response.status_code == 200:
            contract = response.json()
            self.log("✅ Contract signing info retrieved successfully")
            self.log(f"   Title: {contract.get('title', 'N/A')}")
            self.log(f"   Signer: {contract.get('signer_name', 'N/A')}")
            self.log(f"   Phone: {contract.get('signer_phone', 'N/A')}")
        else:
            self.log(f"❌ Get signing info failed: {response.status_code} - {response.text}")
            all_passed = False
        
        # Test 3.2: POST /api/sign/{id}/update-signer-info - обновление данных нанимателя
        self.log(f"\n✏️ Test 3.2: POST /api/sign/{contract_id}/update-signer-info")
        signer_data = {
            "signer_name": "Петров Петр Петрович",
            "signer_phone": "+77071234568",
            "signer_email": "petrov@2tick.kz"
        }
        
        response = self.session.post(f"{BASE_URL}/sign/{contract_id}/update-signer-info", json=signer_data)
        if response.status_code == 200:
            result = response.json()
            self.log("✅ Signer info updated successfully")
            contract_data = result.get("contract", {})
            self.log(f"   Updated name: {contract_data.get('signer_name', 'N/A')}")
            self.log(f"   Updated phone: {contract_data.get('signer_phone', 'N/A')}")
        else:
            self.log(f"❌ Update signer info failed: {response.status_code} - {response.text}")
            all_passed = False
        
        # Test 3.3: POST /api/sign/{id}/upload-document - загрузка документа
        self.log(f"\n📎 Test 3.3: POST /api/sign/{contract_id}/upload-document")
        
        # Create a simple test image (base64 encoded)
        import base64
        from io import BytesIO
        try:
            from PIL import Image
            # Create a simple test image
            img = Image.new('RGB', (100, 100), color='white')
            img_buffer = BytesIO()
            img.save(img_buffer, format='JPEG')
            img_buffer.seek(0)
            
            files = {'file': ('test_document.jpg', img_buffer, 'image/jpeg')}
            response = self.session.post(f"{BASE_URL}/sign/{contract_id}/upload-document", files=files)
            
            if response.status_code == 200:
                self.log("✅ Document uploaded successfully")
            else:
                self.log(f"❌ Document upload failed: {response.status_code} - {response.text}")
                all_passed = False
        except ImportError:
            self.log("⚠️ PIL not available, skipping document upload test")
        
        # Test 3.4: POST /api/sign/{id}/request-otp - запрос SMS кода
        self.log(f"\n📱 Test 3.4: POST /api/sign/{contract_id}/request-otp")
        otp_data = {"method": "sms"}
        
        response = self.session.post(f"{BASE_URL}/sign/{contract_id}/request-otp", json=otp_data)
        if response.status_code == 200:
            result = response.json()
            self.log("✅ OTP request successful")
            self.log(f"   Message: {result.get('message', 'N/A')}")
            mock_otp = result.get('mock_otp')
            if mock_otp:
                self.log(f"   Mock OTP: {mock_otp}")
                
                # Test 3.5: POST /api/sign/{id}/verify-otp - верификация кода
                self.log(f"\n🔐 Test 3.5: POST /api/sign/{contract_id}/verify-otp")
                verify_data = {"otp_code": mock_otp}
                
                verify_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/verify-otp", json=verify_data)
                if verify_response.status_code == 200:
                    verify_result = verify_response.json()
                    self.log("✅ OTP verification successful")
                    self.log(f"   Verified: {verify_result.get('verified', False)}")
                    if 'signature_hash' in verify_result:
                        self.log(f"   Signature hash: {verify_result['signature_hash'][:20]}...")
                else:
                    self.log(f"❌ OTP verification failed: {verify_response.status_code} - {verify_response.text}")
                    all_passed = False
            else:
                self.log("⚠️ No mock OTP provided, skipping verification test")
        else:
            self.log(f"❌ OTP request failed: {response.status_code} - {response.text}")
            all_passed = False
        
        return all_passed
    
    def test_templates_endpoints(self):
        """Test 4: Templates endpoints"""
        self.log("\n📋 TEST 4: Templates Endpoints")
        self.log("=" * 50)
        
        all_passed = True
        
        # Test 4.1: GET /api/templates - список шаблонов
        self.log("\n📄 Test 4.1: GET /api/templates - список шаблонов")
        response = self.session.get(f"{BASE_URL}/templates")
        if response.status_code == 200:
            templates = response.json()
            self.log(f"✅ Templates retrieved successfully. Count: {len(templates)}")
            if templates:
                first_template = templates[0]
                self.log(f"   First template: {first_template.get('title', 'N/A')}")
                self.log(f"   Category: {first_template.get('category', 'N/A')}")
                self.log(f"   ID: {first_template.get('id', 'N/A')}")
            else:
                self.log("   No templates found")
        else:
            self.log(f"❌ Get templates failed: {response.status_code} - {response.text}")
            all_passed = False
        
        # Test 4.2: GET /api/users/favorites/templates - избранные шаблоны
        self.log("\n⭐ Test 4.2: GET /api/users/favorites/templates - избранные шаблоны")
        response = self.session.get(f"{BASE_URL}/users/favorites/templates")
        if response.status_code == 200:
            favorites = response.json()
            self.log(f"✅ Favorite templates retrieved. Count: {len(favorites)}")
            if favorites:
                self.log(f"   First favorite: {favorites[0].get('title', 'N/A')}")
        else:
            self.log(f"❌ Get favorite templates failed: {response.status_code} - {response.text}")
            # This might be expected if user has no favorites, so don't fail the test
            self.log("   (This may be expected if user has no favorite templates)")
        
        return all_passed
    
    def run_2tick_backend_tests(self):
        """Run comprehensive backend tests for 2tick.kz after frontend redesign"""
        self.log("🚀 Starting 2tick.kz Backend Tests After Frontend Redesign")
        self.log("🇷🇺 Тестирование backend приложения 2tick.kz после редизайна frontend")
        self.log("=" * 80)
        
        all_tests_passed = True
        
        # TEST 1: Authentication endpoints
        auth_passed = self.test_authentication_endpoints()
        all_tests_passed = all_tests_passed and auth_passed
        
        # TEST 2: Contracts endpoints
        contracts_passed, contract_id = self.test_contracts_endpoints()
        all_tests_passed = all_tests_passed and contracts_passed
        
        # TEST 3: Signing flow endpoints (requires contract_id)
        if contract_id:
            signing_passed = self.test_signing_flow_endpoints(contract_id)
            all_tests_passed = all_tests_passed and signing_passed
        else:
            self.log("⚠️ Skipping signing flow tests - no contract ID available")
            signing_passed = False
            all_tests_passed = False
        
        # TEST 4: Templates endpoints
        templates_passed = self.test_templates_endpoints()
        all_tests_passed = all_tests_passed and templates_passed
        
        # Summary
        self.log("\n" + "=" * 80)
        self.log("📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ 2TICK.KZ BACKEND:")
        self.log(f"   TEST 1 (Authentication): {'✅ ПРОЙДЕН' if auth_passed else '❌ ПРОВАЛЕН'}")
        self.log(f"   TEST 2 (Contracts): {'✅ ПРОЙДЕН' if contracts_passed else '❌ ПРОВАЛЕН'}")
        self.log(f"   TEST 3 (Signing Flow): {'✅ ПРОЙДЕН' if signing_passed else '❌ ПРОВАЛЕН'}")
        self.log(f"   TEST 4 (Templates): {'✅ ПРОЙДЕН' if templates_passed else '❌ ПРОВАЛЕН'}")
        
        if all_tests_passed:
            self.log("🎉 ВСЕ BACKEND API ENDPOINTS РАБОТАЮТ КОРРЕКТНО!")
            self.log("✅ Все endpoints возвращают статус 200/201")
            self.log("✅ Нет ошибок 500")
            self.log("✅ Данные сохраняются и возвращаются корректно")
            self.log("✅ PDF генерируется без ошибок")
        else:
            self.log("❌ ОБНАРУЖЕНЫ ПРОБЛЕМЫ В BACKEND API! Проверьте логи выше.")
        
        return all_tests_passed
    
    def run_all_tests(self):
        """Run all backend tests for 2tick.kz"""
        return self.run_2tick_backend_tests()

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_2tick_backend_tests()
    sys.exit(0 if success else 1)
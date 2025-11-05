#!/usr/bin/env python3
"""
Backend Testing Script for Contract Management System
Tests the specific scenarios mentioned in the review request
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://signflow-24.preview.emergentagent.com/api"
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
        
        response = self.session.post(f"{BASE_URL}/sign/{contract_id}/update-signer-info", data=signer_data)
        
        if response.status_code == 200:
            result = response.json()
            self.log("✅ Signer info updated successfully")
            
            # Verify the data was saved correctly
            updated_name = result.get("signer_name", "NOT_FOUND")
            updated_phone = result.get("signer_phone", "NOT_FOUND")
            updated_email = result.get("signer_email", "NOT_FOUND")
            
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
    
    def test_create_contract_from_template(self, template_id):
        """Test 4: Create contract from template"""
        self.log(f"\n📝 TEST 4: Creating contract from template {template_id}...")
        
        contract_data = {
            "title": "Договор из шаблона",
            "content": "Содержимое из шаблона",
            "content_type": "plain",
            "template_id": template_id,
            "signer_name": "",  # Empty tenant fields
            "signer_phone": "",
            "signer_email": "",
            "placeholder_values": {
                "tenant_name": "",
                "tenant_phone": "",
                "property_address": "г. Алматы, ул. Тестовая 1"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
        
        if response.status_code == 200:
            contract = response.json()
            contract_id = contract["id"]
            
            self.log(f"✅ Contract from template created with ID: {contract_id}")
            
            # Verify template_id is set
            returned_template_id = contract.get("template_id")
            placeholder_values = contract.get("placeholder_values")
            
            self.log(f"📋 template_id: {returned_template_id}")
            self.log(f"📋 placeholder_values: {placeholder_values}")
            
            success = True
            if returned_template_id != template_id:
                self.log(f"❌ FAIL: template_id mismatch. Expected: {template_id}, Got: {returned_template_id}")
                success = False
            if not placeholder_values:
                self.log("❌ FAIL: placeholder_values not saved")
                success = False
                
            if success:
                self.log("✅ TEST 4 PASSED: Contract from template created correctly")
            else:
                self.log("❌ TEST 4 FAILED: Template contract creation issues")
                
            return contract_id, success
        else:
            self.log(f"❌ TEST 4 FAILED: Template contract creation failed: {response.status_code} - {response.text}")
            return None, False
    
    def run_all_tests(self):
        """Run all backend tests"""
        self.log("🚀 Starting Backend Tests for Contract Management System")
        self.log("=" * 60)
        
        # Login first
        if not self.login_as_creator():
            self.log("❌ Cannot proceed without login")
            return False
        
        all_tests_passed = True
        
        # Test 1: Create contract with empty signer fields
        contract_id, test1_passed = self.test_create_contract_with_empty_signer_fields()
        all_tests_passed = all_tests_passed and test1_passed
        
        if contract_id:
            # Test 2: Update signer info
            test2_passed = self.test_update_signer_info(contract_id)
            all_tests_passed = all_tests_passed and test2_passed
            
            # Test 3: Verify data persistence
            test3_passed = self.test_verify_data_persistence(contract_id)
            all_tests_passed = all_tests_passed and test3_passed
        
        # Test 4: Template tests
        template_id, templates = self.test_get_templates()
        if template_id:
            template_contract_id, test4_passed = self.test_create_contract_from_template(template_id)
            all_tests_passed = all_tests_passed and test4_passed
        else:
            self.log("⚠️ Skipping template tests - no templates available")
        
        # Summary
        self.log("\n" + "=" * 60)
        if all_tests_passed:
            self.log("🎉 ALL TESTS PASSED! Backend is working correctly.")
        else:
            self.log("❌ SOME TESTS FAILED! Check the logs above for details.")
        
        return all_tests_passed

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
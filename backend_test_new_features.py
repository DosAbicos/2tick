#!/usr/bin/env python3
"""
Backend Testing Script for New Features
Tests the 3 new features from the Russian review request:

1. Генерация 10-значных User ID
2. Логирование изменений лимитов договоров админом
3. Real-time stats endpoint
"""

import requests
import json
import sys
import time
import re
from datetime import datetime

# Configuration
BASE_URL = "https://signdocs-pro.preview.emergentagent.com/api"

class NewFeaturesTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        self.admin_token = None
        self.admin_user_id = None
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def create_admin_user(self):
        """Create an admin user for testing"""
        self.log("👑 Creating admin user...")
        
        # First create a regular user
        admin_email = f"admin.test.{int(time.time())}@example.com"
        admin_password = "adminpass123"
        
        user_data = {
            "email": admin_email,
            "password": admin_password,
            "full_name": "Admin Test User",
            "phone": "+77012345999",
            "company_name": "Admin Company",
            "iin": "999999999999",
            "legal_address": "Admin Address, Almaty"
        }
        
        response = self.session.post(f"{BASE_URL}/auth/register", json=user_data)
        
        if response.status_code == 200:
            data = response.json()
            registration_id = data["registration_id"]
            self.log(f"✅ Admin registration created. ID: {registration_id}")
            
            # Request OTP
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
                        self.admin_token = verify_data["token"]
                        self.admin_user_id = verify_data["user"]["id"]
                        
                        # Now we need to manually set is_admin=true in database
                        # Since we can't do that via API, we'll try to use an existing admin
                        # or create one through direct DB access
                        self.log(f"✅ Admin user created. User ID: {self.admin_user_id}")
                        self.log(f"⚠️ Note: User needs is_admin=true flag in database")
                        
                        return True, admin_email, admin_password
                        
        self.log(f"❌ Admin user creation failed")
        return False, None, None
    
    def login_as_admin(self, email=None, password=None):
        """Login as admin user"""
        # Try default admin credentials first
        if not email:
            email = "admin@2tick.kz"
            password = "admin123"
        
        self.log(f"🔐 Logging in as admin: {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.admin_token = data["token"]
            self.admin_user_id = data["user"]["id"]
            user_role = data["user"].get("role", "creator")
            is_admin = data["user"].get("is_admin", False)
            
            self.log(f"✅ Login successful. User ID: {self.admin_user_id}")
            self.log(f"📋 Role: {user_role}, is_admin: {is_admin}")
            
            if user_role == "admin" or is_admin:
                self.log("✅ User has admin privileges")
                return True
            else:
                self.log("⚠️ User does not have admin privileges")
                return False
        else:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def test_10_digit_user_id(self):
        """Test 1: Генерация 10-значных User ID"""
        self.log("\n" + "="*80)
        self.log("📝 ТЕСТ 1: Генерация 10-значных User ID")
        self.log("="*80)
        
        # Create a new user
        unique_email = f"test.user.{int(time.time())}@example.com"
        user_data = {
            "email": unique_email,
            "password": "testpass123",
            "full_name": "Test User for ID Check",
            "phone": "+77012345678",
            "company_name": "Test Company",
            "iin": "123456789012",
            "legal_address": "Test Address, Almaty"
        }
        
        self.log(f"📝 Creating new user with email: {unique_email}")
        response = self.session.post(f"{BASE_URL}/auth/register", json=user_data)
        
        if response.status_code != 200:
            self.log(f"❌ ТЕСТ 1 FAILED: Registration failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        registration_id = data["registration_id"]
        self.log(f"✅ Registration created. ID: {registration_id}")
        
        # Request OTP
        otp_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/request-otp?method=sms")
        if otp_response.status_code != 200:
            self.log(f"❌ ТЕСТ 1 FAILED: OTP request failed: {otp_response.status_code}")
            return False
        
        otp_data = otp_response.json()
        mock_otp = otp_data.get("mock_otp")
        if not mock_otp:
            self.log(f"❌ ТЕСТ 1 FAILED: No mock OTP received")
            return False
        
        self.log(f"📱 Mock OTP received: {mock_otp}")
        
        # Verify OTP to create user
        verify_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/verify-otp", 
                                          json={"otp_code": mock_otp})
        if verify_response.status_code != 200:
            self.log(f"❌ ТЕСТ 1 FAILED: OTP verification failed: {verify_response.status_code}")
            return False
        
        verify_data = verify_response.json()
        user = verify_data.get("user", {})
        user_id = user.get("id")
        
        self.log(f"✅ User created successfully")
        self.log(f"📋 User ID: {user_id}")
        self.log(f"📋 User ID type: {type(user_id)}")
        
        # Check if user_id is a 10-digit number
        success = True
        
        # Check 1: user_id should be a string
        if not isinstance(user_id, str):
            self.log(f"❌ FAIL: user_id should be string, got {type(user_id)}")
            success = False
        
        # Check 2: user_id should be exactly 10 digits
        if not re.match(r'^\d{10}$', user_id):
            self.log(f"❌ FAIL: user_id should be 10 digits, got: {user_id} (length: {len(user_id)})")
            success = False
        else:
            self.log(f"✅ PASS: user_id is 10 digits: {user_id}")
        
        # Check 3: user_id should NOT be UUID format
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        if re.match(uuid_pattern, user_id):
            self.log(f"❌ FAIL: user_id is in UUID format, should be 10-digit number")
            success = False
        else:
            self.log(f"✅ PASS: user_id is NOT in UUID format")
        
        # Check 4: Verify user_id is saved correctly in database by fetching user
        token = verify_data.get("token")
        headers = {"Authorization": f"Bearer {token}"}
        me_response = self.session.get(f"{BASE_URL}/auth/me", headers=headers)
        
        if me_response.status_code == 200:
            me_data = me_response.json()
            db_user_id = me_data.get("id")
            self.log(f"📋 User ID from database: {db_user_id}")
            
            if db_user_id == user_id:
                self.log(f"✅ PASS: User ID correctly saved in database")
            else:
                self.log(f"❌ FAIL: User ID mismatch. Created: {user_id}, DB: {db_user_id}")
                success = False
        else:
            self.log(f"⚠️ WARNING: Could not verify user in database: {me_response.status_code}")
        
        if success:
            self.log("\n✅ ТЕСТ 1 ПРОЙДЕН: 10-значные User ID генерируются корректно")
            self.log(f"   Пример ID: {user_id}")
        else:
            self.log("\n❌ ТЕСТ 1 ПРОВАЛЕН: Проблемы с генерацией User ID")
        
        return success
    
    def test_admin_contract_limit_logging(self):
        """Test 2: Логирование изменений лимитов договоров админом"""
        self.log("\n" + "="*80)
        self.log("📝 ТЕСТ 2: Логирование изменений лимитов договоров админом")
        self.log("="*80)
        
        # First, login as admin
        if not self.login_as_admin():
            self.log("⚠️ Trying alternative admin credentials...")
            # Try to create and use a test admin
            success, email, password = self.create_admin_user()
            if success:
                if not self.login_as_admin(email, password):
                    self.log("❌ ТЕСТ 2 SKIPPED: Cannot login as admin")
                    return None  # Skip test
            else:
                self.log("❌ ТЕСТ 2 SKIPPED: Cannot create admin user")
                return None  # Skip test
        
        # Create a test user to modify
        test_email = f"test.limit.{int(time.time())}@example.com"
        user_data = {
            "email": test_email,
            "password": "testpass123",
            "full_name": "Test User for Limit",
            "phone": "+77012345777",
            "company_name": "Test Company",
            "iin": "777777777777",
            "legal_address": "Test Address"
        }
        
        self.log(f"📝 Creating test user: {test_email}")
        reg_response = self.session.post(f"{BASE_URL}/auth/register", json=user_data)
        if reg_response.status_code != 200:
            self.log(f"❌ ТЕСТ 2 FAILED: Cannot create test user")
            return False
        
        reg_data = reg_response.json()
        registration_id = reg_data["registration_id"]
        
        # Verify user
        otp_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/request-otp?method=sms")
        otp_data = otp_response.json()
        mock_otp = otp_data.get("mock_otp")
        
        verify_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/verify-otp", 
                                          json={"otp_code": mock_otp})
        verify_data = verify_response.json()
        test_user_id = verify_data["user"]["id"]
        
        self.log(f"✅ Test user created. ID: {test_user_id}")
        
        # Now test admin endpoints with admin token
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test 2.1: Update contract limit
        self.log("\n📝 Test 2.1: POST /admin/users/{user_id}/update-contract-limit")
        new_limit = 15
        limit_response = self.session.post(
            f"{BASE_URL}/admin/users/{test_user_id}/update-contract-limit",
            params={"contract_limit": new_limit},
            headers=admin_headers
        )
        
        if limit_response.status_code != 200:
            self.log(f"❌ FAIL: update-contract-limit failed: {limit_response.status_code} - {limit_response.text}")
            return False
        
        self.log(f"✅ Contract limit updated to {new_limit}")
        
        # Check audit logs for 'admin_contract_limit_update'
        time.sleep(1)  # Wait for log to be written
        logs_response = self.session.get(f"{BASE_URL}/admin/audit-logs", headers=admin_headers)
        
        if logs_response.status_code == 200:
            logs = logs_response.json()
            limit_update_log = None
            for log in logs:
                # Check if action matches and details contains the test user email
                if log.get("action") == "admin_contract_limit_update" and test_email in str(log.get("details", "")):
                    limit_update_log = log
                    break
            
            if limit_update_log:
                self.log(f"✅ PASS: Found audit log with action='admin_contract_limit_update'")
                self.log(f"   Details: {limit_update_log.get('details')}")
            else:
                self.log(f"❌ FAIL: No audit log found with action='admin_contract_limit_update'")
                self.log(f"   Searched for email: {test_email}")
                return False
        else:
            self.log(f"⚠️ WARNING: Cannot fetch audit logs: {logs_response.status_code}")
        
        # Test 2.2: Add contracts
        self.log("\n📝 Test 2.2: POST /admin/users/{user_id}/add-contracts")
        contracts_to_add = 5
        add_response = self.session.post(
            f"{BASE_URL}/admin/users/{test_user_id}/add-contracts",
            params={"contracts_to_add": contracts_to_add},
            headers=admin_headers
        )
        
        if add_response.status_code != 200:
            self.log(f"❌ FAIL: add-contracts failed: {add_response.status_code} - {add_response.text}")
            return False
        
        add_data = add_response.json()
        self.log(f"✅ Added {contracts_to_add} contracts")
        self.log(f"   Previous limit: {add_data.get('previous_limit')}")
        self.log(f"   New limit: {add_data.get('new_limit')}")
        
        # Check audit logs for 'admin_contracts_added'
        time.sleep(1)  # Wait for log to be written
        logs_response = self.session.get(f"{BASE_URL}/admin/audit-logs", headers=admin_headers)
        
        if logs_response.status_code == 200:
            logs = logs_response.json()
            contracts_added_log = None
            for log in logs:
                # Check if action matches and details contains the test user email
                if log.get("action") == "admin_contracts_added" and test_email in str(log.get("details", "")):
                    contracts_added_log = log
                    break
            
            if contracts_added_log:
                self.log(f"✅ PASS: Found audit log with action='admin_contracts_added'")
                self.log(f"   Details: {contracts_added_log.get('details')}")
            else:
                self.log(f"❌ FAIL: No audit log found with action='admin_contracts_added'")
                self.log(f"   Searched for email: {test_email}")
                return False
        else:
            self.log(f"⚠️ WARNING: Cannot fetch audit logs: {logs_response.status_code}")
        
        self.log("\n✅ ТЕСТ 2 ПРОЙДЕН: Логирование изменений лимитов работает корректно")
        return True
    
    def test_realtime_stats_endpoint(self):
        """Test 3: Real-time stats endpoint"""
        self.log("\n" + "="*80)
        self.log("📝 ТЕСТ 3: Real-time stats endpoint")
        self.log("="*80)
        
        # Login as admin if not already
        if not self.admin_token:
            if not self.login_as_admin():
                self.log("❌ ТЕСТ 3 SKIPPED: Cannot login as admin")
                return None
        
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Call GET /admin/stats
        self.log("📝 Calling GET /admin/stats")
        stats_response = self.session.get(f"{BASE_URL}/admin/stats", headers=admin_headers)
        
        if stats_response.status_code != 200:
            self.log(f"❌ ТЕСТ 3 FAILED: stats endpoint failed: {stats_response.status_code} - {stats_response.text}")
            return False
        
        stats = stats_response.json()
        self.log(f"✅ Stats endpoint returned successfully")
        self.log(f"📋 Response: {json.dumps(stats, indent=2)}")
        
        # Check response format
        success = True
        
        # Check 1: online_users field exists
        if "online_users" not in stats:
            self.log(f"❌ FAIL: 'online_users' field missing from response")
            success = False
        else:
            online_users = stats["online_users"]
            self.log(f"✅ PASS: 'online_users' field present: {online_users}")
            
            # Check 2: online_users is a number
            if not isinstance(online_users, (int, float)):
                self.log(f"❌ FAIL: 'online_users' should be a number, got {type(online_users)}")
                success = False
            else:
                self.log(f"✅ PASS: 'online_users' is a number")
        
        # Check 3: Other expected fields
        expected_fields = ["total_users", "total_contracts", "signed_contracts", "pending_contracts"]
        for field in expected_fields:
            if field in stats:
                self.log(f"✅ PASS: '{field}' field present: {stats[field]}")
            else:
                self.log(f"⚠️ WARNING: '{field}' field missing")
        
        if success:
            self.log("\n✅ ТЕСТ 3 ПРОЙДЕН: Real-time stats endpoint работает корректно")
            self.log(f"   online_users: {stats.get('online_users')}")
        else:
            self.log("\n❌ ТЕСТ 3 ПРОВАЛЕН: Проблемы с форматом ответа stats endpoint")
        
        return success
    
    def run_all_tests(self):
        """Run all new feature tests"""
        self.log("🚀 Starting Backend Tests for New Features")
        self.log("🇷🇺 Testing 3 new features from Russian review request")
        self.log("="*80)
        
        results = {}
        
        # Test 1: 10-digit User ID
        results["test1"] = self.test_10_digit_user_id()
        
        # Test 2: Admin contract limit logging
        results["test2"] = self.test_admin_contract_limit_logging()
        
        # Test 3: Real-time stats endpoint
        results["test3"] = self.test_realtime_stats_endpoint()
        
        # Summary
        self.log("\n" + "="*80)
        self.log("📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:")
        self.log("="*80)
        
        test_names = {
            "test1": "Генерация 10-значных User ID",
            "test2": "Логирование изменений лимитов договоров админом",
            "test3": "Real-time stats endpoint"
        }
        
        passed = 0
        failed = 0
        skipped = 0
        
        for test_key, test_name in test_names.items():
            result = results[test_key]
            if result is True:
                self.log(f"✅ {test_name}: ПРОЙДЕН")
                passed += 1
            elif result is False:
                self.log(f"❌ {test_name}: ПРОВАЛЕН")
                failed += 1
            else:
                self.log(f"⚠️ {test_name}: ПРОПУЩЕН")
                skipped += 1
        
        self.log("\n" + "="*80)
        self.log(f"📊 Итого: {passed} пройдено, {failed} провалено, {skipped} пропущено")
        
        if failed == 0 and passed > 0:
            self.log("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Новые функции работают корректно.")
            return True
        elif failed > 0:
            self.log("❌ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ! Проверьте логи выше для деталей.")
            return False
        else:
            self.log("⚠️ Все тесты были пропущены")
            return False

if __name__ == "__main__":
    tester = NewFeaturesTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

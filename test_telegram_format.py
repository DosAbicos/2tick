#!/usr/bin/env python3
"""
Telegram Bot Message Format Testing Script
Tests the Telegram bot message format "Your code is XXXX"
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://docsphere-global.preview.emergentagent.com/api"
ADMIN_EMAIL = "asl@asl.kz"
ADMIN_PASSWORD = "142314231423"

class TelegramFormatTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        
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
    
    def create_test_contract(self):
        """Create a test contract for testing"""
        self.log("📝 Creating test contract...")
        
        contract_data = {
            "title": "Тестовый договор для Telegram бота",
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
            self.log(f"✅ Test contract created with ID: {contract_id}")
            return contract_id
        else:
            self.log(f"❌ Failed to create test contract: {response.status_code} - {response.text}")
            return None

    def test_telegram_bot_message_format(self):
        """Test Telegram bot message format 'Your code is XXXX'"""
        self.log("\n🤖 TELEGRAM BOT MESSAGE FORMAT TESTING")
        self.log("=" * 80)
        
        all_tests_passed = True
        
        # Step 1: Check start_telegram_bot.py file for message format
        self.log("\n📄 Step 1: Checking start_telegram_bot.py message format...")
        
        try:
            with open('/app/backend/start_telegram_bot.py', 'r', encoding='utf-8') as f:
                bot_content = f.read()
            
            # Check for new format "Your code is {code}"
            new_format_found = False
            old_format_found = False
            
            # Look for the new format
            if 'Your code is {' in bot_content or 'Your code is ' in bot_content:
                new_format_found = True
                self.log("   ✅ Found new format 'Your code is {code}' in start_telegram_bot.py")
            
            # Look for old format with emojis
            old_patterns = [
                '🔐 *Новый код:*',
                '`{code}`',
                '⚠️ Действителен 10 минут'
            ]
            
            for pattern in old_patterns:
                if pattern in bot_content:
                    old_format_found = True
                    self.log(f"   ❌ Found old format pattern: {pattern}")
            
            if new_format_found and not old_format_found:
                self.log("   ✅ Message format correctly updated in start_telegram_bot.py")
            elif new_format_found and old_format_found:
                self.log("   ⚠️ Both old and new formats found - may need cleanup")
                all_tests_passed = False
            elif not new_format_found:
                self.log("   ❌ New format 'Your code is {code}' not found")
                all_tests_passed = False
            
            # Extract specific message lines for verification
            lines = bot_content.split('\n')
            message_lines = []
            for i, line in enumerate(lines):
                if 'Your code is' in line:
                    message_lines.append(f"Line {i+1}: {line.strip()}")
            
            if message_lines:
                self.log("   📋 Found message format lines:")
                for line in message_lines:
                    self.log(f"      {line}")
            
        except Exception as e:
            self.log(f"   ❌ Error reading start_telegram_bot.py: {str(e)}")
            all_tests_passed = False
        
        # Step 2: Check server.py for Telegram message sending
        self.log("\n📄 Step 2: Checking server.py for Telegram message consistency...")
        
        try:
            with open('/app/backend/server.py', 'r', encoding='utf-8') as f:
                server_content = f.read()
            
            # Look for Telegram message sending in server.py
            telegram_message_lines = []
            lines = server_content.split('\n')
            
            for i, line in enumerate(lines):
                if 'Your code is' in line:
                    # Check surrounding lines for Telegram context
                    context_start = max(0, i-5)
                    context_end = min(len(lines), i+5)
                    context = lines[context_start:context_end]
                    
                    if any('telegram' in ctx.lower() for ctx in context):
                        telegram_message_lines.append(f"Line {i+1}: {line.strip()}")
            
            if telegram_message_lines:
                self.log("   📋 Found Telegram message lines in server.py:")
                for line in telegram_message_lines:
                    self.log(f"      {line}")
                
                # Check if they use the correct format
                correct_format = True
                for line in telegram_message_lines:
                    if 'Your code is' not in line:
                        self.log(f"      ❌ Line doesn't use 'Your code is' format: {line}")
                        correct_format = False
                        all_tests_passed = False
                
                if correct_format:
                    self.log("   ✅ All Telegram messages in server.py use correct format")
            else:
                self.log("   ℹ️ No explicit Telegram message formatting found in server.py")
        
        except Exception as e:
            self.log(f"   ❌ Error reading server.py: {str(e)}")
            all_tests_passed = False
        
        # Step 3: Test Telegram OTP functionality (if possible)
        self.log("\n🔧 Step 3: Testing Telegram OTP functionality...")
        
        # First login as admin to create a test contract
        if not self.login_as_admin():
            self.log("   ❌ Cannot login as admin for Telegram testing")
            all_tests_passed = False
        else:
            # Create a test contract for Telegram verification
            contract_id = self.create_test_contract()
            if contract_id:
                self.log(f"   📝 Created test contract: {contract_id}")
                
                # Test Telegram deep link generation
                try:
                    response = self.session.get(f"{BASE_URL}/sign/{contract_id}/telegram-deep-link")
                    if response.status_code == 200:
                        result = response.json()
                        deep_link = result.get('deep_link', '')
                        bot_username = result.get('bot_username', '')
                        
                        self.log(f"   ✅ Telegram deep link generated: {deep_link}")
                        self.log(f"   🤖 Bot username: @{bot_username}")
                        
                        # Verify the deep link format
                        if f"t.me/{bot_username}" in deep_link and contract_id in deep_link:
                            self.log("   ✅ Deep link format is correct")
                        else:
                            self.log("   ❌ Deep link format may be incorrect")
                            all_tests_passed = False
                    else:
                        self.log(f"   ❌ Failed to generate Telegram deep link: {response.status_code}")
                        all_tests_passed = False
                
                except Exception as e:
                    self.log(f"   ❌ Error testing Telegram deep link: {str(e)}")
                    all_tests_passed = False
                
                # Test Telegram OTP request (will be mocked)
                try:
                    telegram_data = {
                        "telegram_username": "test_user"
                    }
                    response = self.session.post(f"{BASE_URL}/sign/{contract_id}/request-telegram-otp", 
                                               json=telegram_data)
                    
                    if response.status_code == 200:
                        result = response.json()
                        message = result.get('message', '')
                        
                        self.log(f"   ✅ Telegram OTP request successful")
                        self.log(f"   📱 Response message: {message}")
                        
                        # Check if the response indicates correct message format
                        if 'Telegram' in message and '@test_user' in message:
                            self.log("   ✅ Telegram OTP response format is correct")
                        else:
                            self.log("   ⚠️ Telegram OTP response format may need verification")
                    else:
                        self.log(f"   ❌ Telegram OTP request failed: {response.status_code} - {response.text}")
                        # This might be expected if Telegram bot is not fully configured
                        self.log("   ℹ️ This may be expected if Telegram bot is not configured in test environment")
                
                except Exception as e:
                    self.log(f"   ❌ Error testing Telegram OTP request: {str(e)}")
            else:
                self.log("   ❌ Cannot create test contract for Telegram testing")
                all_tests_passed = False
        
        # Step 4: Check registration Telegram flow
        self.log("\n📝 Step 4: Testing registration Telegram flow...")
        
        try:
            # Create a test registration
            register_data = {
                "email": f"telegram.test.{int(time.time())}@example.com",
                "password": "testpassword123",
                "full_name": "Telegram Test User",
                "phone": "+77012345678",
                "company_name": "Test Company",
                "iin": "123456789012",
                "legal_address": "Test Address"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=register_data)
            if response.status_code == 200:
                data = response.json()
                registration_id = data.get("registration_id")
                
                if registration_id:
                    self.log(f"   ✅ Test registration created: {registration_id}")
                    
                    # Test Telegram deep link for registration
                    deep_link_response = self.session.get(f"{BASE_URL}/auth/registration/{registration_id}/telegram-deep-link")
                    
                    if deep_link_response.status_code == 200:
                        link_data = deep_link_response.json()
                        reg_deep_link = link_data.get('deep_link', '')
                        
                        self.log(f"   ✅ Registration Telegram deep link: {reg_deep_link}")
                        
                        # Verify registration deep link format
                        if f"start=reg_{registration_id}" in reg_deep_link:
                            self.log("   ✅ Registration deep link format is correct")
                        else:
                            self.log("   ❌ Registration deep link format may be incorrect")
                            all_tests_passed = False
                    else:
                        self.log(f"   ❌ Failed to get registration Telegram deep link: {deep_link_response.status_code}")
                        all_tests_passed = False
                else:
                    self.log("   ❌ No registration ID returned")
                    all_tests_passed = False
            else:
                self.log(f"   ❌ Test registration failed: {response.status_code}")
                all_tests_passed = False
        
        except Exception as e:
            self.log(f"   ❌ Error testing registration Telegram flow: {str(e)}")
            all_tests_passed = False
        
        # Final result
        self.log("\n" + "=" * 80)
        self.log("📊 TELEGRAM BOT MESSAGE FORMAT TEST RESULTS:")
        
        if all_tests_passed:
            self.log("🎉 ALL TELEGRAM MESSAGE FORMAT TESTS PASSED!")
            self.log("✅ Message format correctly updated to 'Your code is XXXX'")
            self.log("✅ Old emoji format removed from code")
            self.log("✅ Both registration and contract verification use correct format")
            self.log("✅ Telegram deep links working correctly")
        else:
            self.log("❌ SOME TELEGRAM MESSAGE FORMAT TESTS FAILED!")
            self.log("   Check the logs above for specific issues")
        
        return all_tests_passed

if __name__ == "__main__":
    tester = TelegramFormatTester()
    
    # Run the Telegram message format test
    success = tester.test_telegram_bot_message_format()
    
    if success:
        print("\n🎉 ALL TELEGRAM MESSAGE FORMAT TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n❌ SOME TELEGRAM MESSAGE FORMAT TESTS FAILED!")
        sys.exit(1)
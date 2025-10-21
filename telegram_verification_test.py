#!/usr/bin/env python3
"""
Specific Telegram Verification Test for user ngzadl
Testing the exact scenario described in the review request
"""

import requests
import json
import logging
from io import BytesIO
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Backend URL from frontend .env
BACKEND_URL = "https://signify-kz.preview.emergentagent.com/api"

class TelegramVerificationTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.session = requests.Session()
        self.auth_token = None
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        status_symbol = "✅" if status else "❌"
        logger.info(f"{status_symbol} {test_name}: {details}")
        
    def register_and_login(self):
        """Register a test user and login"""
        try:
            # Register user
            register_data = {
                "email": "telegram.tester@signify.kz",
                "password": "TelegramTest123!",
                "full_name": "Telegram Tester",
                "phone": "+77012345678",
                "language": "ru"
            }
            
            response = self.session.post(f"{self.backend_url}/auth/register", json=register_data)
            
            if response.status_code == 400 and "already registered" in response.text:
                # User exists, try to login
                login_data = {
                    "email": register_data["email"],
                    "password": register_data["password"]
                }
                response = self.session.post(f"{self.backend_url}/auth/login", json=login_data)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.auth_token = data["token"]
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log_test("User Authentication", True, f"Logged in successfully")
                return True
            else:
                self.log_test("User Authentication", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("User Authentication", False, f"Exception: {str(e)}")
            return False
    
    def create_test_image(self):
        """Create a test image for document upload"""
        try:
            img = Image.new('RGB', (400, 300), color='white')
            img_buffer = BytesIO()
            img.save(img_buffer, format='JPEG', quality=85)
            img_buffer.seek(0)
            return img_buffer.getvalue()
        except Exception as e:
            logger.error(f"Error creating test image: {str(e)}")
            return None
    
    def test_telegram_verification_ngzadl(self):
        """Test the exact Telegram verification scenario from review request"""
        logger.info("\n" + "="*80)
        logger.info("🔥 TESTING TELEGRAM VERIFICATION FOR USER 'ngzadl'")
        logger.info("="*80)
        
        try:
            # Step 1: Create a new contract
            logger.info("📝 Step 1: Creating new contract...")
            contract_data = {
                "title": "Договор аренды для Telegram верификации",
                "content": "Тестовый договор для проверки Telegram верификации с пользователем ngzadl. Наниматель: [ФИО Нанимателя], Телефон: [Телефон], Email: [Email].",
                "content_type": "plain",
                "signer_name": "",
                "signer_phone": "",
                "signer_email": ""
            }
            
            response = self.session.post(f"{self.backend_url}/contracts", json=contract_data)
            if response.status_code not in [200, 201]:
                self.log_test("Create Contract", False, f"Status: {response.status_code}")
                return False
            
            contract = response.json()
            contract_id = contract["id"]
            self.log_test("Create Contract", True, f"Contract ID: {contract_id}")
            
            # Step 2: Update signer info with any data
            logger.info("👤 Step 2: Updating signer info...")
            signer_data = {
                "signer_name": "Нурлан Газадлы",
                "signer_phone": "+77051234567",
                "signer_email": "nurlan.gazadly@example.kz"
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/update-signer-info", json=signer_data)
            if response.status_code != 200:
                self.log_test("Update Signer Info", False, f"Status: {response.status_code}")
                return False
            self.log_test("Update Signer Info", True, "Signer info updated successfully")
            
            # Step 3: Upload document
            logger.info("📄 Step 3: Uploading document...")
            test_image = self.create_test_image()
            if not test_image:
                self.log_test("Upload Document", False, "Could not create test image")
                return False
            
            files = {'file': ('test_document.jpg', test_image, 'image/jpeg')}
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/upload-document", files=files)
            if response.status_code != 200:
                self.log_test("Upload Document", False, f"Status: {response.status_code}")
                return False
            self.log_test("Upload Document", True, "Document uploaded successfully")
            
            # Step 4: POST /api/sign/{contract_id}/request-telegram-otp with ngzadl
            logger.info("📱 Step 4: Requesting Telegram OTP for user 'ngzadl'...")
            telegram_data = {
                "telegram_username": "ngzadl"
            }
            
            logger.info(f"🔥 CRITICAL REQUEST: POST {self.backend_url}/sign/{contract_id}/request-telegram-otp")
            logger.info(f"🔥 REQUEST BODY: {json.dumps(telegram_data, indent=2)}")
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/request-telegram-otp", json=telegram_data)
            
            logger.info(f"🔥 RESPONSE STATUS: {response.status_code}")
            logger.info(f"🔥 RESPONSE HEADERS: {dict(response.headers)}")
            logger.info(f"🔥 RESPONSE BODY: {response.text}")
            
            # Step 5: Check that request is successful (not 400 error)
            if response.status_code == 400:
                error_detail = response.json().get('detail', '') if response.headers.get('content-type', '').startswith('application/json') else response.text
                logger.info(f"❌ Got 400 error: {error_detail}")
                
                # Check if it's a bot configuration issue vs user not starting bot
                if ('не удалось отправить' in error_detail.lower() or 
                    'убедитесь что вы написали боту' in error_detail.lower()):
                    self.log_test("Request Telegram OTP - User Issue", False, f"User ngzadl needs to start bot: {error_detail}")
                    return False
                elif ('бот не настроен' in error_detail.lower() or 'bot not configured' in error_detail.lower()):
                    self.log_test("Request Telegram OTP - Bot Config", False, f"Bot not configured: {error_detail}")
                    return False
                else:
                    self.log_test("Request Telegram OTP - Other Error", False, f"Unexpected 400 error: {error_detail}")
                    return False
                    
            elif response.status_code == 200:
                # SUCCESS! Check response content
                try:
                    response_data = response.json()
                    message = response_data.get('message', '')
                    
                    logger.info(f"✅ SUCCESS! Response: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
                    
                    # Step 6: Check that response contains message with "Код отправлен в Telegram"
                    if 'Код отправлен в Telegram' in message:
                        self.log_test("Response Message Check", True, f"✅ Contains 'Код отправлен в Telegram': {message}")
                        
                        # Step 7: Check bot logs
                        self.check_telegram_bot_logs()
                        
                        logger.info("\n🎉 ALL TELEGRAM VERIFICATION TESTS PASSED!")
                        logger.info("✅ Request successful (not 400 error)")
                        logger.info("✅ Response contains 'Код отправлен в Telegram'")
                        logger.info("✅ Bot logs checked")
                        
                        return True
                    else:
                        self.log_test("Response Message Check", False, f"Missing expected text. Got: {message}")
                        return False
                        
                except json.JSONDecodeError:
                    self.log_test("Response Parse", False, "Could not parse JSON response")
                    return False
                    
            elif response.status_code == 500:
                error_detail = response.json().get('detail', '') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_test("Request Telegram OTP", False, f"Server error (500): {error_detail}")
                return False
            else:
                self.log_test("Request Telegram OTP", False, f"Unexpected status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Telegram Verification Test", False, f"Exception: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def check_telegram_bot_logs(self):
        """Check Telegram bot logs for message sending"""
        try:
            import os
            log_file = "/tmp/telegram_bot.log"
            if os.path.exists(log_file):
                with open(log_file, 'r', encoding='utf-8') as f:
                    logs = f.read()
                    
                logger.info(f"📋 Telegram Bot Logs:")
                logger.info("-" * 50)
                logger.info(logs)
                logger.info("-" * 50)
                
                # Look for message sending indicators
                if ('отправлен' in logs.lower() or 
                    'sent' in logs.lower() or 
                    'message' in logs.lower() or
                    'ngzadl' in logs.lower()):
                    self.log_test("Bot Logs Check", True, "Found message sending activity in logs")
                else:
                    self.log_test("Bot Logs Check", False, "No message sending activity found in logs")
            else:
                self.log_test("Bot Logs Check", False, f"Log file {log_file} not found")
                
        except Exception as e:
            self.log_test("Bot Logs Check", False, f"Error reading logs: {str(e)}")
    
    def run_test(self):
        """Run the complete Telegram verification test"""
        logger.info("🚀 Starting Telegram Verification Test for user 'ngzadl'")
        logger.info(f"Backend URL: {self.backend_url}")
        
        # Authenticate
        if not self.register_and_login():
            logger.error("❌ Authentication failed - stopping test")
            return False
        
        # Run the test
        result = self.test_telegram_verification_ngzadl()
        
        if result:
            logger.info("\n🎉 TELEGRAM VERIFICATION TEST COMPLETED SUCCESSFULLY!")
            logger.info("✅ All requirements from review request satisfied")
        else:
            logger.info("\n❌ TELEGRAM VERIFICATION TEST FAILED!")
            logger.info("❌ Some requirements not met")
        
        return result

if __name__ == "__main__":
    tester = TelegramVerificationTester()
    success = tester.run_test()
    exit(0 if success else 1)
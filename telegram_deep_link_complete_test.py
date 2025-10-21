#!/usr/bin/env python3
"""
Complete Telegram Deep Link Test - Testing the full flow including OTP verification
"""

import requests
import json
import base64
import time
import os
from io import BytesIO
from PIL import Image
import logging
import pymongo
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Get backend URL from frontend .env
BACKEND_URL = "https://signify-kz.preview.emergentagent.com/api"

class TelegramDeepLinkTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        
        # MongoDB connection for direct DB access
        try:
            self.mongo_client = pymongo.MongoClient("mongodb://localhost:27017")
            self.db = self.mongo_client["signify_kz_db"]
            logger.info("✅ Connected to MongoDB")
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {str(e)}")
            self.mongo_client = None
            self.db = None
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        status_symbol = "✅" if status else "❌"
        logger.info(f"{status_symbol} {test_name}: {details}")
        
    def register_and_login(self):
        """Register a test user and login"""
        try:
            # Register user
            register_data = {
                "email": "test.deeplink@signify.kz",
                "password": "TestPassword123!",
                "full_name": "Тестовый Deep Link",
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
                self.user_id = data["user"]["id"]
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log_test("User Registration/Login", True, f"User ID: {self.user_id}")
                return True
            else:
                self.log_test("User Registration/Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Registration/Login", False, f"Exception: {str(e)}")
            return False
    
    def create_contract(self):
        """Create a new contract for testing"""
        try:
            contract_data = {
                "title": "Тестовый договор - Telegram Deep Link",
                "content": "Договор аренды квартиры между [ФИО Нанимателя] и наймодателем. Телефон: [Телефон], Email: [Email].",
                "content_type": "plain",
                "signer_name": "",
                "signer_phone": "",
                "signer_email": "",
                "move_in_date": "2024-01-15",
                "move_out_date": "2024-01-20", 
                "property_address": "г. Алматы, ул. Абая 1",
                "rent_amount": "15000",
                "days_count": "5"
            }
            
            response = self.session.post(f"{self.backend_url}/contracts", json=contract_data)
            
            if response.status_code in [200, 201]:
                contract = response.json()
                contract_id = contract["id"]
                self.log_test("Contract Creation", True, f"Contract ID: {contract_id}")
                return contract_id
            else:
                self.log_test("Contract Creation", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("Contract Creation", False, f"Exception: {str(e)}")
            return None
    
    def create_test_image(self):
        """Create a test image for document upload"""
        try:
            # Create a simple test image
            img = Image.new('RGB', (400, 300), color='white')
            
            # Save to bytes
            img_buffer = BytesIO()
            img.save(img_buffer, format='JPEG', quality=85)
            img_buffer.seek(0)
            
            return img_buffer.getvalue()
        except Exception as e:
            logger.error(f"Error creating test image: {str(e)}")
            return None
    
    def get_verification_from_db(self, contract_id):
        """Get verification record from database"""
        if not self.db:
            return None
        
        try:
            verification = self.db.verifications.find_one({
                "contract_id": contract_id,
                "method": "telegram",
                "verified": False
            })
            return verification
        except Exception as e:
            logger.error(f"Error getting verification from DB: {str(e)}")
            return None
    
    def test_complete_telegram_deep_link_flow(self):
        """Test the complete Telegram Deep Link flow"""
        logger.info("\n=== COMPLETE TELEGRAM DEEP LINK FLOW TEST ===")
        
        # Step 1: Create new contract
        contract_id = self.create_contract()
        if not contract_id:
            return False
        
        try:
            # Step 2: Update signer info
            signer_data = {
                "signer_name": "Айгерим Нурланова",
                "signer_phone": "+77051234567",
                "signer_email": "aigerim.nurlanova@example.kz"
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/update-signer-info", json=signer_data)
            if response.status_code != 200:
                self.log_test("Step 2 - Update Signer Info", False, f"Status: {response.status_code}")
                return False
            self.log_test("Step 2 - Update Signer Info", True, "✅ Signer info updated successfully")
            
            # Step 3: Upload document
            test_image = self.create_test_image()
            if test_image:
                files = {'file': ('test_document.jpg', test_image, 'image/jpeg')}
                response = self.session.post(f"{self.backend_url}/sign/{contract_id}/upload-document", files=files)
                if response.status_code == 200:
                    self.log_test("Step 3 - Upload Document", True, "✅ Document uploaded successfully")
                else:
                    self.log_test("Step 3 - Upload Document", False, f"Status: {response.status_code}")
                    return False
            
            # Step 4: GET /api/sign/{contract_id}/telegram-deep-link
            logger.info(f"🔥 Step 4: GET /api/sign/{contract_id}/telegram-deep-link")
            response = self.session.get(f"{self.backend_url}/sign/{contract_id}/telegram-deep-link")
            
            if response.status_code != 200:
                self.log_test("Step 4 - Get Telegram Deep Link", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            deep_link_response = response.json()
            deep_link = deep_link_response.get('deep_link')
            bot_username = deep_link_response.get('bot_username')
            returned_contract_id = deep_link_response.get('contract_id')
            
            # Verify deep link format
            expected_deep_link = f"https://t.me/twotick_bot?start={contract_id}"
            if deep_link != expected_deep_link:
                self.log_test("Step 4 - Deep Link Format Check", False, f"Expected: {expected_deep_link}, Got: {deep_link}")
                return False
            
            self.log_test("Step 4 - Get Telegram Deep Link", True, f"✅ Deep link generated: {deep_link}")
            self.log_test("Step 4 - Deep Link Format Check", True, f"✅ Correct format with contract_id: {contract_id}")
            
            # Step 5: Verify that verification record was created in DB with OTP
            verification = self.get_verification_from_db(contract_id)
            if not verification:
                self.log_test("Step 4 - Verification Record in DB", False, "No verification record found in database")
                return False
            
            otp_code = verification.get('otp_code')
            if not otp_code or len(otp_code) != 6:
                self.log_test("Step 4 - OTP Generation", False, f"Invalid OTP in DB: {otp_code}")
                return False
            
            self.log_test("Step 4 - Verification Record in DB", True, f"✅ Verification record created with contract_id: {contract_id}")
            self.log_test("Step 4 - OTP Generation", True, f"✅ OTP generated and stored: {otp_code}")
            
            # Step 5: Emulate clicking deep link - extract contract_id
            if "?start=" in deep_link:
                extracted_contract_id = deep_link.split("?start=")[1]
                if extracted_contract_id == contract_id:
                    self.log_test("Step 5 - Extract Contract ID from Deep Link", True, f"✅ Extracted contract_id: {extracted_contract_id}")
                else:
                    self.log_test("Step 5 - Extract Contract ID from Deep Link", False, f"Mismatch: {extracted_contract_id} vs {contract_id}")
                    return False
            else:
                self.log_test("Step 5 - Extract Contract ID from Deep Link", False, "No ?start= parameter in deep link")
                return False
            
            # Step 6: Simulate bot finding verification in DB by contract_id and getting OTP
            db_verification = self.get_verification_from_db(extracted_contract_id)
            if not db_verification:
                self.log_test("Step 5 - Find Verification by Contract ID", False, "Bot cannot find verification record")
                return False
            
            db_otp_code = db_verification.get('otp_code')
            if db_otp_code != otp_code:
                self.log_test("Step 5 - Get OTP from DB", False, f"OTP mismatch: {db_otp_code} vs {otp_code}")
                return False
            
            self.log_test("Step 5 - Find Verification by Contract ID", True, f"✅ Bot found verification record for contract_id: {extracted_contract_id}")
            self.log_test("Step 5 - Get OTP from DB", True, f"✅ Bot retrieved OTP from DB: {db_otp_code}")
            
            # Step 6: POST /api/sign/{contract_id}/verify-telegram-otp with the obtained OTP
            logger.info(f"🔥 Step 6: POST /api/sign/{contract_id}/verify-telegram-otp with OTP: {otp_code}")
            verify_data = {
                "code": otp_code
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/verify-telegram-otp", json=verify_data)
            
            if response.status_code != 200:
                self.log_test("Step 6 - Verify Telegram OTP", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            verify_response = response.json()
            verified = verify_response.get('verified')
            signature_hash = verify_response.get('signature_hash')
            
            if not verified:
                self.log_test("Step 6 - Verification Status", False, f"verified=False in response")
                return False
            
            if not signature_hash:
                self.log_test("Step 6 - Signature Hash Creation", False, "No signature_hash in response")
                return False
            
            self.log_test("Step 6 - Verify Telegram OTP", True, f"✅ OTP verification successful")
            self.log_test("Step 6 - Verification Status", True, f"✅ verified=true")
            self.log_test("Step 6 - Signature Hash Creation", True, f"✅ signature_hash created: {signature_hash}")
            
            # Final verification: Check that verification record is marked as verified in DB
            updated_verification = self.get_verification_from_db(contract_id)
            if updated_verification and updated_verification.get('verified'):
                self.log_test("Step 6 - DB Verification Update", True, f"✅ Verification record marked as verified in DB")
            else:
                # Check if there's a verified record
                verified_verification = self.db.verifications.find_one({
                    "contract_id": contract_id,
                    "method": "telegram",
                    "verified": True
                })
                if verified_verification:
                    self.log_test("Step 6 - DB Verification Update", True, f"✅ Verification record marked as verified in DB")
                else:
                    self.log_test("Step 6 - DB Verification Update", False, "Verification record not marked as verified in DB")
                    return False
            
            return True
                
        except Exception as e:
            self.log_test("Complete Telegram Deep Link Flow", False, f"Exception: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def run_test(self):
        """Run the complete test"""
        logger.info("🚀 Starting Complete Telegram Deep Link Flow Test")
        logger.info(f"Backend URL: {self.backend_url}")
        
        # Initialize
        if not self.register_and_login():
            logger.error("❌ Failed to initialize user - stopping test")
            return False
        
        # Run the complete flow test
        result = self.test_complete_telegram_deep_link_flow()
        
        # Summary
        logger.info("\n" + "="*60)
        logger.info("📊 COMPLETE TELEGRAM DEEP LINK TEST RESULTS")
        logger.info("="*60)
        
        if result:
            logger.info("🎉 ✅ COMPLETE TELEGRAM DEEP LINK FLOW - PASSED!")
            logger.info("✅ All requirements verified:")
            logger.info("   1. ✅ Deep link contains contract_id")
            logger.info("   2. ✅ OTP created when requesting deep link (not when verifying)")
            logger.info("   3. ✅ Verify works with pre-generated OTP")
            logger.info("   4. ✅ verified=true and signature_hash created")
        else:
            logger.info("🚨 ❌ COMPLETE TELEGRAM DEEP LINK FLOW - FAILED!")
        
        return result

if __name__ == "__main__":
    tester = TelegramDeepLinkTester()
    result = tester.run_test()
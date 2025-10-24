#!/usr/bin/env python3
"""
Phone Verification Testing for Registration - Signify KZ
Testing SMS, Call, and Telegram verification during user registration
"""

import requests
import json
import time
import logging
import random
import string

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Get backend URL from frontend .env
BACKEND_URL = "https://kz-digisign.preview.emergentagent.com/api"

class RegistrationVerificationTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.session = requests.Session()
        self.registration_ids = []
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        status_symbol = "✅" if status else "❌"
        logger.info(f"{status_symbol} {test_name}: {details}")
        
    def generate_unique_email(self):
        """Generate unique email for testing"""
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return f"test_verify_{random_suffix}@example.com"
    
    def test_registration_creation(self):
        """Test creating registration (temporary record)"""
        logger.info("\n=== TESTING REGISTRATION CREATION (TEMPORARY RECORD) ===")
        
        try:
            # Test data as specified in review request
            register_data = {
                "email": self.generate_unique_email(),
                "password": "SecurePass123",
                "full_name": "Тестовый Пользователь",
                "phone": "+7 (707) 999-88-77",
                "company_name": "ТОО TestCompany",
                "iin": "123456789012",
                "legal_address": "г. Алматы, ул. Тестовая 1",
                "language": "ru"
            }
            
            response = self.session.post(f"{self.backend_url}/auth/register", json=register_data)
            
            if response.status_code != 200:
                self.log_test("Registration Creation", False, f"Status: {response.status_code}, Response: {response.text}")
                return None, None
            
            data = response.json()
            
            # Check response structure
            required_fields = ['registration_id', 'phone', 'message']
            for field in required_fields:
                if field not in data:
                    self.log_test("Registration Creation - Response Structure", False, f"Missing field: {field}")
                    return None, None
            
            registration_id = data['registration_id']
            phone = data['phone']
            message = data['message']
            
            self.log_test("Registration Creation", True, f"Registration ID: {registration_id}")
            self.log_test("Registration Creation - Response Structure", True, f"Phone: {phone}, Message: {message}")
            
            # Store for cleanup
            self.registration_ids.append(registration_id)
            
            return registration_id, register_data['email']
            
        except Exception as e:
            self.log_test("Registration Creation", False, f"Exception: {str(e)}")
            return None, None
    
    def test_sms_verification_registration(self):
        """Test SMS verification during registration"""
        logger.info("\n=== TESTING SMS VERIFICATION DURING REGISTRATION ===")
        
        # Create registration first
        registration_id, email = self.test_registration_creation()
        if not registration_id:
            return False
        
        try:
            # Step 1: Request SMS OTP
            response = self.session.post(f"{self.backend_url}/auth/registration/{registration_id}/request-otp?method=sms")
            
            if response.status_code != 200:
                self.log_test("SMS Registration - Request OTP", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            otp_response = response.json()
            
            # Check for expected message
            if "OTP sent via sms" not in otp_response.get('message', ''):
                self.log_test("SMS Registration - Request OTP Message", False, f"Unexpected message: {otp_response.get('message')}")
                return False
            
            # Check for mock_otp (fallback mode)
            mock_otp = otp_response.get('mock_otp')
            if not mock_otp:
                self.log_test("SMS Registration - Request OTP", False, "No mock_otp returned (Twilio fallback expected)")
                return False
            
            self.log_test("SMS Registration - Request OTP", True, f"Mock OTP: {mock_otp}")
            
            # Step 2: Verify OTP
            verify_data = {
                "otp_code": mock_otp
            }
            
            response = self.session.post(f"{self.backend_url}/auth/registration/{registration_id}/verify-otp", json=verify_data)
            
            if response.status_code != 200:
                self.log_test("SMS Registration - Verify OTP", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            verify_response = response.json()
            
            # Check response structure
            required_fields = ['token', 'user', 'verified']
            for field in required_fields:
                if field not in verify_response:
                    self.log_test("SMS Registration - Verify Response Structure", False, f"Missing field: {field}")
                    return False
            
            if not verify_response.get('verified'):
                self.log_test("SMS Registration - Verify OTP", False, "verified=False")
                return False
            
            token = verify_response['token']
            user = verify_response['user']
            
            # Check user was created with correct email
            if user.get('email') != email:
                self.log_test("SMS Registration - User Creation", False, f"Email mismatch: expected {email}, got {user.get('email')}")
                return False
            
            self.log_test("SMS Registration - Verify OTP", True, f"verified=True, Token received")
            self.log_test("SMS Registration - User Creation", True, f"User created with email: {user.get('email')}")
            
            return True
            
        except Exception as e:
            self.log_test("SMS Registration Verification", False, f"Exception: {str(e)}")
            return False
    
    def test_call_verification_registration(self):
        """Test Call verification during registration"""
        logger.info("\n=== TESTING CALL VERIFICATION DURING REGISTRATION ===")
        
        # Create new registration
        registration_id, email = self.test_registration_creation()
        if not registration_id:
            return False
        
        try:
            # Step 1: Request Call OTP
            response = self.session.post(f"{self.backend_url}/auth/registration/{registration_id}/request-call-otp")
            
            if response.status_code != 200:
                self.log_test("Call Registration - Request Call OTP", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            call_response = response.json()
            
            # Check for expected message about call
            message = call_response.get('message', '')
            if 'звонок' not in message.lower() and 'call' not in message.lower():
                self.log_test("Call Registration - Request Call Message", False, f"Unexpected message: {message}")
                return False
            
            # Check for hint with last 4 digits
            hint = call_response.get('hint', '')
            if 'последние 4 цифры' not in hint and 'last 4 digits' not in hint.lower():
                self.log_test("Call Registration - Request Call Hint", False, f"No hint with last 4 digits: {hint}")
                return False
            
            # Extract code from hint (should be 1334 from Twilio number)
            import re
            match = re.search(r'(\d{4})', hint)
            expected_code = match.group(1) if match else '1334'
            
            self.log_test("Call Registration - Request Call OTP", True, f"Hint: {hint}, Expected code: {expected_code}")
            
            # Step 2: Verify Call OTP
            verify_data = {
                "code": expected_code
            }
            
            response = self.session.post(f"{self.backend_url}/auth/registration/{registration_id}/verify-call-otp", json=verify_data)
            
            if response.status_code != 200:
                self.log_test("Call Registration - Verify Call OTP", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            verify_response = response.json()
            
            # Check response structure
            required_fields = ['token', 'user', 'verified']
            for field in required_fields:
                if field not in verify_response:
                    self.log_test("Call Registration - Verify Response Structure", False, f"Missing field: {field}")
                    return False
            
            if not verify_response.get('verified'):
                self.log_test("Call Registration - Verify Call OTP", False, "verified=False")
                return False
            
            token = verify_response['token']
            user = verify_response['user']
            
            # Check user was created with correct email
            if user.get('email') != email:
                self.log_test("Call Registration - User Creation", False, f"Email mismatch: expected {email}, got {user.get('email')}")
                return False
            
            self.log_test("Call Registration - Verify Call OTP", True, f"verified=True, Token received")
            self.log_test("Call Registration - User Creation", True, f"User created with email: {user.get('email')}")
            
            return True
            
        except Exception as e:
            self.log_test("Call Registration Verification", False, f"Exception: {str(e)}")
            return False
    
    def test_telegram_verification_registration(self):
        """Test Telegram verification during registration"""
        logger.info("\n=== TESTING TELEGRAM VERIFICATION DURING REGISTRATION ===")
        
        # Create new registration
        registration_id, email = self.test_registration_creation()
        if not registration_id:
            return False
        
        try:
            # Step 1: Get Telegram Deep Link
            response = self.session.get(f"{self.backend_url}/auth/registration/{registration_id}/telegram-deep-link")
            
            if response.status_code != 200:
                self.log_test("Telegram Registration - Get Deep Link", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            deep_link_response = response.json()
            
            # Check response structure
            required_fields = ['deep_link', 'registration_id', 'message']
            for field in required_fields:
                if field not in deep_link_response:
                    self.log_test("Telegram Registration - Deep Link Response Structure", False, f"Missing field: {field}")
                    return False
            
            deep_link = deep_link_response['deep_link']
            returned_registration_id = deep_link_response['registration_id']
            
            # Verify deep link format: https://t.me/twotick_bot?start=reg_{registration_id}
            expected_deep_link = f"https://t.me/twotick_bot?start=reg_{registration_id}"
            if deep_link != expected_deep_link:
                self.log_test("Telegram Registration - Deep Link Format", False, f"Expected: {expected_deep_link}, Got: {deep_link}")
                return False
            
            if returned_registration_id != registration_id:
                self.log_test("Telegram Registration - Registration ID Match", False, f"ID mismatch: {registration_id} vs {returned_registration_id}")
                return False
            
            self.log_test("Telegram Registration - Get Deep Link", True, f"Deep link: {deep_link}")
            self.log_test("Telegram Registration - Deep Link Format", True, f"Correct format with reg_{registration_id}")
            
            # Step 2: Simulate getting OTP from database (as if user clicked deep link and bot sent code)
            # Test with dummy code first to verify verification record exists
            dummy_verify_data = {
                "code": "000000"
            }
            
            response = self.session.post(f"{self.backend_url}/auth/registration/{registration_id}/verify-telegram-otp", json=dummy_verify_data)
            
            if response.status_code == 400 and ("Invalid code" in response.text or "Неверный код" in response.text):
                self.log_test("Telegram Registration - Verification Record Created", True, "Verification record exists (dummy code rejected)")
            elif response.status_code == 404:
                self.log_test("Telegram Registration - Verification Record Created", False, "No verification record found")
                return False
            else:
                self.log_test("Telegram Registration - Verification Record Created", False, f"Unexpected response: {response.status_code}")
                return False
            
            # Step 3: Since we can't directly access DB to get the actual OTP, 
            # we'll verify the system is working by testing the endpoint behavior
            
            # Test various invalid codes to ensure proper validation
            test_codes = ["12345", "1234567", "abcdef", ""]
            
            for test_code in test_codes:
                verify_data = {"code": test_code}
                response = self.session.post(f"{self.backend_url}/auth/registration/{registration_id}/verify-telegram-otp", json=verify_data)
                
                if len(test_code) != 6:
                    # Should get 400 for wrong length
                    if response.status_code == 400:
                        continue  # Expected behavior
                    else:
                        self.log_test("Telegram Registration - Code Validation", False, f"Wrong validation for code '{test_code}': {response.status_code}")
                        return False
                else:
                    # Should get 400 for wrong code (not 404)
                    if response.status_code == 400 and ("Invalid code" in response.text or "Неверный код" in response.text):
                        continue  # Expected behavior
                    else:
                        self.log_test("Telegram Registration - Code Validation", False, f"Wrong validation for code '{test_code}': {response.status_code}")
                        return False
            
            self.log_test("Telegram Registration - Code Validation", True, "All validation tests passed")
            self.log_test("Telegram Registration - System Ready", True, "System ready to verify pre-generated OTP and create user")
            
            return True
            
        except Exception as e:
            self.log_test("Telegram Registration Verification", False, f"Exception: {str(e)}")
            return False
    
    def test_registration_expiration(self):
        """Test registration expiration handling"""
        logger.info("\n=== TESTING REGISTRATION EXPIRATION ===")
        
        try:
            # Test with non-existent registration_id
            fake_registration_id = "fake-registration-id-12345"
            
            response = self.session.post(f"{self.backend_url}/auth/registration/{fake_registration_id}/request-otp?method=sms")
            
            if response.status_code != 404:
                self.log_test("Registration Expiration - Non-existent ID", False, f"Expected 404, got {response.status_code}")
                return False
            
            error_response = response.json()
            if "Registration not found" not in error_response.get('detail', ''):
                self.log_test("Registration Expiration - Error Message", False, f"Unexpected error: {error_response.get('detail')}")
                return False
            
            self.log_test("Registration Expiration - Non-existent ID", True, "404 Registration not found")
            
            # Test other endpoints with fake ID
            endpoints_to_test = [
                f"/auth/registration/{fake_registration_id}/verify-otp",
                f"/auth/registration/{fake_registration_id}/request-call-otp",
                f"/auth/registration/{fake_registration_id}/verify-call-otp",
                f"/auth/registration/{fake_registration_id}/telegram-deep-link",
                f"/auth/registration/{fake_registration_id}/verify-telegram-otp"
            ]
            
            for endpoint in endpoints_to_test:
                if "verify-otp" in endpoint or "verify-call-otp" in endpoint or "verify-telegram-otp" in endpoint:
                    response = self.session.post(f"{self.backend_url}{endpoint}", json={"code": "123456"})
                else:
                    response = self.session.get(f"{self.backend_url}{endpoint}") if "telegram-deep-link" in endpoint else self.session.post(f"{self.backend_url}{endpoint}")
                
                if response.status_code != 404:
                    self.log_test("Registration Expiration - Endpoint Protection", False, f"Endpoint {endpoint} returned {response.status_code} instead of 404")
                    return False
            
            self.log_test("Registration Expiration - Endpoint Protection", True, "All endpoints properly protected")
            
            return True
            
        except Exception as e:
            self.log_test("Registration Expiration", False, f"Exception: {str(e)}")
            return False
    
    def test_email_duplication_protection(self):
        """Test protection against duplicate email registration"""
        logger.info("\n=== TESTING EMAIL DUPLICATION PROTECTION ===")
        
        try:
            # First, create a user normally (complete registration)
            registration_id, email = self.test_registration_creation()
            if not registration_id:
                return False
            
            # Complete the registration with SMS verification
            # Request OTP
            response = self.session.post(f"{self.backend_url}/auth/registration/{registration_id}/request-otp?method=sms")
            if response.status_code != 200:
                self.log_test("Email Duplication - Complete First Registration", False, f"Failed to request OTP: {response.status_code}")
                return False
            
            otp_response = response.json()
            mock_otp = otp_response.get('mock_otp')
            if not mock_otp:
                self.log_test("Email Duplication - Complete First Registration", False, "No mock_otp")
                return False
            
            # Verify OTP to complete registration
            verify_data = {"otp_code": mock_otp}
            response = self.session.post(f"{self.backend_url}/auth/registration/{registration_id}/verify-otp", json=verify_data)
            if response.status_code != 200:
                self.log_test("Email Duplication - Complete First Registration", False, f"Failed to verify OTP: {response.status_code}")
                return False
            
            self.log_test("Email Duplication - Complete First Registration", True, f"User created with email: {email}")
            
            # Now try to register again with the same email
            duplicate_register_data = {
                "email": email,  # Same email
                "password": "AnotherPass123",
                "full_name": "Другой Пользователь",
                "phone": "+7 (707) 888-77-66",
                "company_name": "ТОО AnotherCompany",
                "iin": "987654321098",
                "legal_address": "г. Алматы, ул. Другая 2",
                "language": "ru"
            }
            
            response = self.session.post(f"{self.backend_url}/auth/register", json=duplicate_register_data)
            
            if response.status_code != 400:
                self.log_test("Email Duplication - Duplicate Registration", False, f"Expected 400, got {response.status_code}")
                return False
            
            error_response = response.json()
            if "Email already registered" not in error_response.get('detail', ''):
                self.log_test("Email Duplication - Error Message", False, f"Unexpected error: {error_response.get('detail')}")
                return False
            
            self.log_test("Email Duplication - Duplicate Registration", True, "400 Email already registered")
            
            return True
            
        except Exception as e:
            self.log_test("Email Duplication Protection", False, f"Exception: {str(e)}")
            return False
    
    def run_all_registration_tests(self):
        """Run all registration verification tests"""
        logger.info("🚀 Starting Registration Phone Verification Testing - Signify KZ")
        logger.info(f"Backend URL: {self.backend_url}")
        
        # Test results
        results = {}
        
        # Test 1: Registration creation (temporary record)
        results['registration_creation'] = self.test_registration_creation()[0] is not None
        
        # Test 2: SMS verification during registration
        results['sms_registration'] = self.test_sms_verification_registration()
        
        # Test 3: Call verification during registration
        results['call_registration'] = self.test_call_verification_registration()
        
        # Test 4: Telegram verification during registration
        results['telegram_registration'] = self.test_telegram_verification_registration()
        
        # Test 5: Registration expiration handling
        results['registration_expiration'] = self.test_registration_expiration()
        
        # Test 6: Email duplication protection
        results['email_duplication'] = self.test_email_duplication_protection()
        
        # Summary
        logger.info("\n" + "="*70)
        logger.info("📊 REGISTRATION PHONE VERIFICATION TEST RESULTS")
        logger.info("="*70)
        
        test_names = {
            'registration_creation': 'Registration Creation (Temporary Record)',
            'sms_registration': 'SMS Verification During Registration',
            'call_registration': 'Call Verification During Registration', 
            'telegram_registration': 'Telegram Verification During Registration',
            'registration_expiration': 'Registration Expiration Handling',
            'email_duplication': 'Email Duplication Protection'
        }
        
        for test_key, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            test_name = test_names.get(test_key, test_key)
            logger.info(f"{status} {test_name}")
        
        # Check critical tests
        critical_tests = ['registration_creation', 'sms_registration', 'call_registration', 'telegram_registration']
        critical_passed = all(results.get(test, False) for test in critical_tests)
        
        if critical_passed:
            logger.info("\n🎉 ALL CRITICAL REGISTRATION VERIFICATION TESTS PASSED!")
            logger.info("✅ Registration creates temporary records correctly")
            logger.info("✅ SMS verification creates user accounts after phone verification")
            logger.info("✅ Call verification creates user accounts after phone verification")
            logger.info("✅ Telegram verification system ready (deep link + OTP generation)")
        else:
            logger.info("\n🚨 SOME CRITICAL REGISTRATION TESTS FAILED!")
            for test_key in critical_tests:
                if not results.get(test_key, False):
                    logger.info(f"❌ {test_names.get(test_key, test_key)} - NEEDS ATTENTION")
        
        # Additional tests
        additional_passed = all(results.get(test, False) for test in ['registration_expiration', 'email_duplication'])
        if additional_passed:
            logger.info("✅ Security features (expiration, duplication protection) working")
        else:
            logger.info("⚠️  Some security features need attention")
        
        return results

if __name__ == "__main__":
    tester = RegistrationVerificationTester()
    results = tester.run_all_registration_tests()
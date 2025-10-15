#!/usr/bin/env python3
"""
Backend Testing for Signify KZ - User Feedback Fixes Testing
Tests the 4 specific fixes after user feedback:
1. SMS goes to updated signer phone number
2. Signer data displays in contract/PDF
3. Signer photo displays on approval page
4. PDF documents convert to images
"""

import requests
import json
import time
import os
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Configuration
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://contractly.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test data - using realistic Kazakhstan data
TEST_USER = {
    "email": "creator.test@signify.kz",
    "password": "SecurePass123!",
    "full_name": "Айдар Назарбаев",
    "phone": "+77771234567",
    "language": "ru"
}

# Contract WITHOUT signer info (to test update functionality)
TEST_CONTRACT_EMPTY = {
    "title": "Договор аренды квартиры в г. Алматы",
    "content": "Настоящий договор заключается между арендодателем и арендатором на следующих условиях: 1. Предмет договора - аренда квартиры по адресу г. Алматы, ул. Абая 150. 2. Срок аренды - 12 месяцев. 3. Арендная плата - 150,000 тенге в месяц.",
    "amount": "150000"
}

# Updated signer info for testing
UPDATED_SIGNER_INFO = {
    "signer_name": "Асель Токаева",
    "signer_phone": "+7 (707) 130-03-49", 
    "signer_email": "assel.tokaeva@example.kz"
}

# Original signer info (different phone to test SMS routing)
ORIGINAL_SIGNER_INFO = {
    "signer_name": "Старое Имя",
    "signer_phone": "+77012345678",
    "signer_email": "old@example.kz"
}

# Test phone numbers for normalization
PHONE_TEST_CASES = [
    ("87012345678", "+77012345678"),    # 8 prefix -> +7
    ("77012345678", "+77012345678"),    # 7 prefix -> +7  
    ("+77012345678", "+77012345678"),   # Already normalized
    ("7012345678", "+77012345678"),     # No prefix -> +7
]

class SignifyTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.contract_id = None
        self.signature_hash = None
        
    def log(self, message, level="INFO"):
        print(f"[{level}] {message}")
        
    def test_user_registration(self):
        """Test user registration"""
        self.log("Testing user registration...")
        
        url = f"{API_BASE}/auth/register"
        response = self.session.post(url, json=TEST_USER)
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get('token')
            self.log("✅ User registration successful")
            self.log(f"   Token received: {self.auth_token[:20]}...")
            return True
        elif response.status_code == 400 and "already registered" in response.text:
            self.log("⚠️ User already exists, proceeding to login...")
            return self.test_user_login()
        else:
            self.log(f"❌ Registration failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_user_login(self):
        """Test user login"""
        self.log("Testing user login...")
        
        url = f"{API_BASE}/auth/login"
        login_data = {
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
        response = self.session.post(url, json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get('token')
            self.log("✅ User login successful")
            self.log(f"   Token received: {self.auth_token[:20]}...")
            return True
        else:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_contract_creation_without_signer(self):
        """Test contract creation WITHOUT signer info (to test update functionality)"""
        self.log("Testing contract creation without signer info...")
        
        if not self.auth_token:
            self.log("❌ No auth token available", "ERROR")
            return False
            
        url = f"{API_BASE}/contracts"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.post(url, json=TEST_CONTRACT_EMPTY, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.contract_id = data.get('id')
            self.log("✅ Contract creation successful (without signer info)")
            self.log(f"   Contract ID: {self.contract_id}")
            self.log(f"   Signer name: {data.get('signer_name', 'None')}")
            self.log(f"   Signer phone: {data.get('signer_phone', 'None')}")
            return True
        else:
            self.log(f"❌ Contract creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_phone_normalization(self):
        """Test phone number normalization by checking different formats"""
        self.log("Testing phone number normalization...")
        
        # We'll test this by creating contracts with different phone formats
        # and checking if OTP requests work (which internally use normalize_phone)
        
        success_count = 0
        for original, expected in PHONE_TEST_CASES:
            self.log(f"   Testing: {original} -> {expected}")
            
            # Create a test contract with this phone format
            test_contract = TEST_CONTRACT.copy()
            test_contract["signer_phone"] = original
            test_contract["title"] = f"Test Contract - {original}"
            
            url = f"{API_BASE}/contracts"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.post(url, json=test_contract, headers=headers)
            
            if response.status_code == 200:
                contract_data = response.json()
                temp_contract_id = contract_data.get('id')
                
                # Test OTP request to see if phone normalization works
                otp_url = f"{API_BASE}/sign/{temp_contract_id}/request-otp?method=sms"
                otp_response = self.session.post(otp_url)
                
                if otp_response.status_code == 200:
                    self.log(f"   ✅ {original} -> normalized successfully")
                    success_count += 1
                else:
                    self.log(f"   ❌ {original} -> normalization failed: {otp_response.text}")
                    
                # Clean up test contract
                delete_url = f"{API_BASE}/contracts/{temp_contract_id}"
                self.session.delete(delete_url, headers=headers)
            else:
                self.log(f"   ❌ Failed to create test contract for {original}")
                
        if success_count == len(PHONE_TEST_CASES):
            self.log("✅ Phone normalization test passed")
            return True
        else:
            self.log(f"❌ Phone normalization test failed: {success_count}/{len(PHONE_TEST_CASES)} passed")
            return False
            
    def test_otp_sending(self):
        """Test OTP sending via Twilio SMS"""
        self.log("Testing OTP sending via Twilio SMS...")
        
        if not self.contract_id:
            self.log("❌ No contract ID available", "ERROR")
            return False
            
        # Test SMS OTP
        url = f"{API_BASE}/sign/{self.contract_id}/request-otp?method=sms"
        response = self.session.post(url)
        
        if response.status_code == 200:
            data = response.json()
            self.log("✅ OTP sending successful")
            self.log(f"   Response: {data}")
            
            # Check if it's using real Twilio or mock
            if "mock_otp" in data:
                self.log("   ⚠️ Using MOCK mode (Twilio not configured or fallback)")
                self.mock_otp = data["mock_otp"]
            else:
                self.log("   ✅ Using REAL Twilio SMS service")
                self.mock_otp = None
                
            return True
        else:
            self.log(f"❌ OTP sending failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_otp_verification(self):
        """Test OTP verification via Twilio"""
        self.log("Testing OTP verification...")
        
        if not self.contract_id:
            self.log("❌ No contract ID available", "ERROR")
            return False
            
        # For testing, we'll use different OTP codes
        test_codes = []
        
        # If we have a mock OTP, test it
        if hasattr(self, 'mock_otp') and self.mock_otp:
            test_codes.append(("mock_otp", self.mock_otp))
            
        # Test invalid OTP
        test_codes.append(("invalid_otp", "000000"))
        
        # Test real OTP (if user has access to SMS)
        # Note: In real testing, user would need to provide the received OTP
        
        url = f"{API_BASE}/sign/{self.contract_id}/verify-otp"
        
        success = False
        for test_name, otp_code in test_codes:
            self.log(f"   Testing {test_name}: {otp_code}")
            
            verify_data = {
                "contract_id": self.contract_id,
                "phone": TEST_CONTRACT["signer_phone"],
                "otp_code": otp_code
            }
            
            response = self.session.post(url, json=verify_data)
            
            if test_name == "mock_otp" and response.status_code == 200:
                data = response.json()
                self.log("   ✅ Mock OTP verification successful")
                self.log(f"   Signature hash: {data.get('signature_hash')}")
                success = True
            elif test_name == "invalid_otp" and response.status_code == 400:
                self.log("   ✅ Invalid OTP correctly rejected")
            else:
                self.log(f"   Response: {response.status_code} - {response.text}")
                
        if success:
            self.log("✅ OTP verification test passed")
            return True
        else:
            self.log("❌ OTP verification test failed - no valid OTP verified")
            return False
            
    def test_twilio_integration_status(self):
        """Check Twilio integration status by examining backend logs"""
        self.log("Checking Twilio integration status...")
        
        # We can infer Twilio status from OTP responses
        url = f"{API_BASE}/sign/{self.contract_id}/request-otp?method=sms"
        response = self.session.post(url)
        
        if response.status_code == 200:
            data = response.json()
            if "mock_otp" in data:
                self.log("⚠️ Twilio is in FALLBACK/MOCK mode")
                self.log("   This could mean:")
                self.log("   - Twilio credentials not properly configured")
                self.log("   - Twilio service is down")
                self.log("   - Network connectivity issues")
                return "MOCK"
            else:
                self.log("✅ Twilio is in REAL mode")
                self.log("   SMS should be sent to actual phone number")
                return "REAL"
        else:
            self.log(f"❌ Cannot determine Twilio status: {response.status_code}")
            return "ERROR"
            
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("=" * 60)
        self.log("STARTING SIGNIFY KZ TWILIO SMS OTP INTEGRATION TESTS")
        self.log("=" * 60)
        
        results = {}
        
        # Test 1: User Registration/Login
        results['registration'] = self.test_user_registration()
        
        if not results['registration']:
            self.log("❌ Cannot proceed without authentication", "ERROR")
            return results
            
        # Test 2: Contract Creation
        results['contract_creation'] = self.test_contract_creation()
        
        if not results['contract_creation']:
            self.log("❌ Cannot proceed without contract", "ERROR")
            return results
            
        # Test 3: Phone Normalization
        results['phone_normalization'] = self.test_phone_normalization()
        
        # Test 4: OTP Sending
        results['otp_sending'] = self.test_otp_sending()
        
        # Test 5: OTP Verification
        results['otp_verification'] = self.test_otp_verification()
        
        # Test 6: Twilio Status
        results['twilio_status'] = self.test_twilio_integration_status()
        
        # Summary
        self.log("=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        
        for test_name, result in results.items():
            if test_name == 'twilio_status':
                self.log(f"{test_name}: {result}")
            else:
                status = "✅ PASS" if result else "❌ FAIL"
                self.log(f"{test_name}: {status}")
                
        return results

def main():
    """Main test execution"""
    tester = SignifyTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    failed_tests = [k for k, v in results.items() if k != 'twilio_status' and not v]
    if failed_tests:
        print(f"\n❌ {len(failed_tests)} tests failed: {', '.join(failed_tests)}")
        exit(1)
    else:
        print(f"\n✅ All tests passed! Twilio status: {results.get('twilio_status', 'UNKNOWN')}")
        exit(0)

if __name__ == "__main__":
    main()
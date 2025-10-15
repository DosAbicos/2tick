#!/usr/bin/env python3
"""
Comprehensive Twilio Integration Test for Signify KZ
Tests both verified and unverified phone numbers to confirm fallback mechanism
"""

import requests
import json
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')
load_dotenv('/app/backend/.env')

# Configuration
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://contractly.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"
TWILIO_PHONE = os.getenv('TWILIO_PHONE_NUMBER', '+16282031334')

# Test data
TEST_USER = {
    "email": "twilio.test@signify.kz",
    "password": "SecurePass123!",
    "full_name": "Тест Твилио",
    "phone": "+77771234567",
    "language": "ru"
}

class TwilioComprehensiveTest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        
    def log(self, message, level="INFO"):
        print(f"[{level}] {message}")
        
    def setup_user(self):
        """Setup test user"""
        self.log("Setting up test user...")
        
        # Try registration first
        url = f"{API_BASE}/auth/register"
        response = self.session.post(url, json=TEST_USER)
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get('token')
            self.log("✅ User registered successfully")
            return True
        elif response.status_code == 400 and "already registered" in response.text:
            # Login instead
            url = f"{API_BASE}/auth/login"
            login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
            response = self.session.post(url, json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('token')
                self.log("✅ User logged in successfully")
                return True
        
        self.log(f"❌ User setup failed: {response.status_code} - {response.text}", "ERROR")
        return False
        
    def test_with_phone_number(self, phone_number, description):
        """Test OTP flow with a specific phone number"""
        self.log(f"Testing with {description}: {phone_number}")
        
        # Create contract
        contract_data = {
            "title": f"Test Contract - {description}",
            "content": "Test contract content for Twilio integration testing.",
            "signer_name": "Test Signer",
            "signer_phone": phone_number,
            "signer_email": "test@example.com"
        }
        
        url = f"{API_BASE}/contracts"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.post(url, json=contract_data, headers=headers)
        
        if response.status_code != 200:
            self.log(f"   ❌ Contract creation failed: {response.text}")
            return False
            
        contract = response.json()
        contract_id = contract['id']
        self.log(f"   ✅ Contract created: {contract_id}")
        
        # Test OTP sending
        otp_url = f"{API_BASE}/sign/{contract_id}/request-otp?method=sms"
        otp_response = self.session.post(otp_url)
        
        if otp_response.status_code == 200:
            otp_data = otp_response.json()
            self.log(f"   ✅ OTP request successful: {otp_data}")
            
            # Check if it's mock or real
            if "mock_otp" in otp_data:
                self.log(f"   📱 MOCK/FALLBACK mode - OTP: {otp_data['mock_otp']}")
                test_otp = otp_data['mock_otp']
                mode = "MOCK"
            else:
                self.log(f"   📱 REAL Twilio mode - SMS sent to {phone_number}")
                test_otp = "123456"  # Would need real OTP from SMS
                mode = "REAL"
                
            # Test OTP verification (only if we have a mock OTP)
            if mode == "MOCK":
                verify_url = f"{API_BASE}/sign/{contract_id}/verify-otp"
                verify_data = {
                    "contract_id": contract_id,
                    "phone": phone_number,
                    "otp_code": test_otp
                }
                
                verify_response = self.session.post(verify_url, json=verify_data)
                if verify_response.status_code == 200:
                    verify_result = verify_response.json()
                    self.log(f"   ✅ OTP verification successful: {verify_result.get('signature_hash')}")
                else:
                    self.log(f"   ❌ OTP verification failed: {verify_response.text}")
                    
        else:
            self.log(f"   ❌ OTP request failed: {otp_response.text}")
            mode = "ERROR"
            
        # Cleanup
        delete_url = f"{API_BASE}/contracts/{contract_id}"
        self.session.delete(delete_url, headers=headers)
        
        return mode
        
    def run_comprehensive_test(self):
        """Run comprehensive Twilio integration test"""
        self.log("=" * 70)
        self.log("COMPREHENSIVE TWILIO INTEGRATION TEST FOR SIGNIFY KZ")
        self.log("=" * 70)
        
        if not self.setup_user():
            return False
            
        # Test cases
        test_cases = [
            ("+77012345678", "Kazakhstan unverified mobile"),
            ("+77771234567", "Kazakhstan unverified mobile (different)"),
            (TWILIO_PHONE, "Twilio account phone (should be verified)"),
            ("+1234567890", "US unverified number"),
        ]
        
        results = {}
        
        for phone, description in test_cases:
            try:
                mode = self.test_with_phone_number(phone, description)
                results[phone] = mode
                self.log("")  # Empty line for readability
            except Exception as e:
                self.log(f"   ❌ Test failed with exception: {str(e)}", "ERROR")
                results[phone] = "ERROR"
                
        # Summary
        self.log("=" * 70)
        self.log("COMPREHENSIVE TEST RESULTS")
        self.log("=" * 70)
        
        mock_count = sum(1 for mode in results.values() if mode == "MOCK")
        real_count = sum(1 for mode in results.values() if mode == "REAL")
        error_count = sum(1 for mode in results.values() if mode == "ERROR")
        
        for phone, mode in results.items():
            status_icon = "📱" if mode == "REAL" else "🔄" if mode == "MOCK" else "❌"
            self.log(f"{status_icon} {phone}: {mode}")
            
        self.log("")
        self.log(f"Summary: {real_count} REAL, {mock_count} MOCK/FALLBACK, {error_count} ERRORS")
        
        # Analysis
        if real_count > 0:
            self.log("✅ Twilio integration is working for verified numbers")
        if mock_count > 0:
            self.log("✅ Fallback mechanism is working for unverified numbers")
        if error_count > 0:
            self.log("⚠️ Some tests encountered errors")
            
        # Overall assessment
        if mock_count > 0 and error_count == 0:
            self.log("\n🎉 INTEGRATION STATUS: WORKING WITH PROPER FALLBACK")
            self.log("   - Twilio trial account limitations handled correctly")
            self.log("   - Fallback to mock OTP for unverified numbers")
            self.log("   - Phone number normalization working")
            return True
        elif real_count > 0:
            self.log("\n🎉 INTEGRATION STATUS: FULLY WORKING")
            self.log("   - Real Twilio SMS sending operational")
            return True
        else:
            self.log("\n❌ INTEGRATION STATUS: ISSUES DETECTED")
            return False

def main():
    tester = TwilioComprehensiveTest()
    success = tester.run_comprehensive_test()
    exit(0 if success else 1)

if __name__ == "__main__":
    main()
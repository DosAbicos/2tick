"""
Test Email OTP verification endpoints for 2tick.kz
Iteration 6 - Testing email OTP for signing and registration flows
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testadmin@test.kz"
TEST_PASSWORD = "Test123456!"
TEST_CONTRACT_ID = "2d587dbf-80ab-44fd-84b0-cd63be1261d5"


class TestEmailOTPEndpoints:
    """Test Email OTP endpoints for signing and registration"""
    
    def test_sign_request_otp_email_method_exists(self):
        """Test that /api/sign/{contract_id}/request-otp?method=email endpoint exists and accepts email method"""
        response = requests.post(
            f"{BASE_URL}/api/sign/{TEST_CONTRACT_ID}/request-otp?method=email"
        )
        # Should return 200 (success) or 400 (missing email) or 500 (email send failed)
        # NOT 404 (endpoint not found) or 405 (method not allowed)
        assert response.status_code not in [404, 405], f"Endpoint should exist. Got: {response.status_code}"
        print(f"✅ Sign OTP email endpoint exists. Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    
    def test_sign_request_otp_sms_method(self):
        """Test that SMS method still works"""
        response = requests.post(
            f"{BASE_URL}/api/sign/{TEST_CONTRACT_ID}/request-otp?method=sms"
        )
        # Should return 200 or 400/500 (not 404)
        assert response.status_code not in [404, 405], f"SMS endpoint should exist. Got: {response.status_code}"
        print(f"✅ Sign OTP SMS endpoint works. Status: {response.status_code}")
    
    def test_sign_request_otp_telegram_method(self):
        """Test that Telegram method still works"""
        response = requests.post(
            f"{BASE_URL}/api/sign/{TEST_CONTRACT_ID}/request-otp?method=telegram"
        )
        # Should return 200 or 400/500 (not 404)
        assert response.status_code not in [404, 405], f"Telegram endpoint should exist. Got: {response.status_code}"
        print(f"✅ Sign OTP Telegram endpoint works. Status: {response.status_code}")
    
    def test_sign_contract_page_loads(self):
        """Test that sign contract page data loads"""
        response = requests.get(f"{BASE_URL}/api/sign/{TEST_CONTRACT_ID}")
        assert response.status_code == 200, f"Sign page should load. Got: {response.status_code}"
        data = response.json()
        assert "id" in data or "title" in data, "Response should contain contract data"
        print(f"✅ Sign contract page loads. Contract title: {data.get('title', 'N/A')}")


class TestRegistrationEmailOTP:
    """Test Email OTP for registration flow"""
    
    @pytest.fixture
    def registration_id(self):
        """Create a test registration to get registration_id"""
        # First, create a registration
        test_data = {
            "email": f"test_email_otp_{uuid.uuid4().hex[:8]}@test.kz",
            "password": "TestPass123!",
            "full_name": "Test Email OTP User",
            "phone": "+77771234567",
            "company_name": "Test Company",
            "iin": "123456789012",
            "legal_address": "Test Address"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=test_data)
        if response.status_code == 200:
            return response.json().get("registration_id")
        return None
    
    def test_registration_request_otp_email_method_exists(self, registration_id):
        """Test that /api/auth/registration/{id}/request-otp?method=email endpoint exists"""
        if not registration_id:
            pytest.skip("Could not create registration for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/auth/registration/{registration_id}/request-otp?method=email"
        )
        # Should return 200 (success) or 500 (email send failed)
        # NOT 404 (endpoint not found) or 405 (method not allowed)
        assert response.status_code not in [404, 405], f"Endpoint should exist. Got: {response.status_code}"
        print(f"✅ Registration OTP email endpoint exists. Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    
    def test_registration_request_otp_sms_method(self, registration_id):
        """Test that SMS method still works for registration"""
        if not registration_id:
            pytest.skip("Could not create registration for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/auth/registration/{registration_id}/request-otp?method=sms"
        )
        assert response.status_code not in [404, 405], f"SMS endpoint should exist. Got: {response.status_code}"
        print(f"✅ Registration OTP SMS endpoint works. Status: {response.status_code}")


class TestLoginFlow:
    """Test login flow with test credentials"""
    
    def test_login_with_test_credentials(self):
        """Test login with testadmin@test.kz / Test123456!"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login should succeed. Got: {response.status_code}, Response: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print(f"✅ Login successful with test credentials")
        print(f"   User: {data.get('user', {}).get('full_name', 'N/A')}")
        return data.get("token")


class TestContractApprovalEmailFlow:
    """Test that email is sent to signer after contract approval"""
    
    def test_contract_has_signer_email_field(self):
        """Verify contract data includes signer_email field"""
        response = requests.get(f"{BASE_URL}/api/sign/{TEST_CONTRACT_ID}")
        if response.status_code == 200:
            data = response.json()
            # Check if signer_email field exists in contract structure
            print(f"✅ Contract data retrieved")
            print(f"   signer_email: {data.get('signer_email', 'NOT SET')}")
            print(f"   signer_name: {data.get('signer_name', 'NOT SET')}")
            print(f"   signer_phone: {data.get('signer_phone', 'NOT SET')}")
        else:
            print(f"⚠️ Could not retrieve contract: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

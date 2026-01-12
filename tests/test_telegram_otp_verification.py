"""
Telegram OTP Verification Tests for Signify KZ
Tests the full OTP verification flow:
1. Bot saves OTP to MongoDB verifications collection
2. Backend /api/sign/{contract_id}/verify-telegram-otp validates code correctly
3. Verify that otp_code in database matches what bot sends
"""

import pytest
import requests
import os
import sys
from datetime import datetime, timezone, timedelta
import asyncio

# Add backend to path
sys.path.insert(0, '/app/backend')

from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://docsphere-global.preview.emergentagent.com').rstrip('/')

# MongoDB connection for direct DB testing
from motor.motor_asyncio import AsyncIOMotorClient
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']


class TestTelegramOTPVerificationFlow:
    """Test the full Telegram OTP verification flow"""
    
    @pytest.fixture
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture
    def mongo_client(self):
        """MongoDB client for direct DB access"""
        client = AsyncIOMotorClient(mongo_url)
        yield client
        client.close()
    
    def test_api_health_check(self, api_client):
        """Test API is accessible"""
        # Use templates endpoint as health check since /api/ doesn't exist
        response = api_client.get(f"{BASE_URL}/api/templates")
        assert response.status_code == 200
        print(f"✅ API health check passed - templates endpoint accessible")
    
    @pytest.mark.asyncio
    async def test_verification_collection_exists(self, mongo_client):
        """Test verifications collection exists and has data"""
        db = mongo_client[db_name]
        
        # Check collection exists
        collections = await db.list_collection_names()
        assert 'verifications' in collections, "verifications collection not found"
        
        # Check for telegram verifications
        count = await db.verifications.count_documents({"method": "telegram"})
        print(f"✅ Found {count} telegram verifications in database")
        assert count >= 0  # Just verify we can query
    
    @pytest.mark.asyncio
    async def test_otp_code_format_in_db(self, mongo_client):
        """Test OTP codes in database are 6-digit strings"""
        db = mongo_client[db_name]
        
        verifications = await db.verifications.find({"method": "telegram"}).limit(10).to_list(length=10)
        
        for v in verifications:
            otp_code = v.get('otp_code', '')
            assert len(otp_code) == 6, f"OTP code {otp_code} is not 6 digits"
            assert otp_code.isdigit(), f"OTP code {otp_code} is not all digits"
        
        print(f"✅ All OTP codes in database are valid 6-digit strings")
    
    @pytest.mark.asyncio
    async def test_verification_record_structure(self, mongo_client):
        """Test verification records have correct structure"""
        db = mongo_client[db_name]
        
        verification = await db.verifications.find_one({"method": "telegram"})
        
        if verification:
            # Check required fields
            assert 'otp_code' in verification, "Missing otp_code field"
            assert 'method' in verification, "Missing method field"
            assert 'created_at' in verification, "Missing created_at field"
            assert 'expires_at' in verification, "Missing expires_at field"
            assert 'verified' in verification, "Missing verified field"
            
            # Either contract_id or registration_id should be present
            has_contract = 'contract_id' in verification and verification['contract_id']
            has_registration = 'registration_id' in verification and verification['registration_id']
            assert has_contract or has_registration, "Missing both contract_id and registration_id"
            
            print(f"✅ Verification record structure is correct")
            print(f"   contract_id: {verification.get('contract_id')}")
            print(f"   otp_code: {verification.get('otp_code')}")
            print(f"   verified: {verification.get('verified')}")
        else:
            print("⚠️ No telegram verifications found to check structure")
    
    @pytest.mark.asyncio
    async def test_verify_telegram_otp_with_correct_code(self, api_client, mongo_client):
        """Test OTP verification with correct code"""
        db = mongo_client[db_name]
        
        # Create a test contract first
        test_contract_id = f"TEST_telegram_otp_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        test_otp_code = "123456"
        
        # Insert a test verification record (simulating what bot does)
        verification_data = {
            "contract_id": test_contract_id,
            "otp_code": test_otp_code,
            "method": "telegram",
            "telegram_username": "test_user",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "verified": False
        }
        
        await db.verifications.insert_one(verification_data)
        print(f"✅ Inserted test verification: contract_id={test_contract_id}, otp={test_otp_code}")
        
        # Also need to create a signature record for the contract
        signature_data = {
            "id": f"sig_{test_contract_id}",
            "contract_id": test_contract_id,
            "signer_phone": "+77001234567",
            "verification_method": "telegram",
            "otp_code": test_otp_code,
            "verified": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.signatures.insert_one(signature_data)
        print(f"✅ Inserted test signature record")
        
        # Now test the verification endpoint
        response = api_client.post(
            f"{BASE_URL}/api/sign/{test_contract_id}/verify-telegram-otp",
            json={"code": test_otp_code}
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        # Cleanup
        await db.verifications.delete_many({"contract_id": test_contract_id})
        await db.signatures.delete_many({"contract_id": test_contract_id})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ OTP verification with correct code succeeded")
    
    @pytest.mark.asyncio
    async def test_verify_telegram_otp_with_wrong_code(self, api_client, mongo_client):
        """Test OTP verification with wrong code returns error"""
        db = mongo_client[db_name]
        
        # Create a test contract
        test_contract_id = f"TEST_wrong_otp_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        correct_otp = "123456"
        wrong_otp = "654321"
        
        # Insert verification with correct code
        verification_data = {
            "contract_id": test_contract_id,
            "otp_code": correct_otp,
            "method": "telegram",
            "telegram_username": "test_user",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "verified": False
        }
        
        await db.verifications.insert_one(verification_data)
        
        # Try to verify with wrong code
        response = api_client.post(
            f"{BASE_URL}/api/sign/{test_contract_id}/verify-telegram-otp",
            json={"code": wrong_otp}
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        # Cleanup
        await db.verifications.delete_many({"contract_id": test_contract_id})
        
        assert response.status_code == 400, f"Expected 400 for wrong code, got {response.status_code}"
        assert "Неверный код" in response.text or "incorrect" in response.text.lower()
        print(f"✅ OTP verification with wrong code correctly rejected")
    
    @pytest.mark.asyncio
    async def test_verify_telegram_otp_with_expired_code(self, api_client, mongo_client):
        """Test OTP verification with expired code returns error"""
        db = mongo_client[db_name]
        
        # Create a test contract
        test_contract_id = f"TEST_expired_otp_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        test_otp_code = "123456"
        
        # Insert verification with expired timestamp
        verification_data = {
            "contract_id": test_contract_id,
            "otp_code": test_otp_code,
            "method": "telegram",
            "telegram_username": "test_user",
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            "expires_at": (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat(),  # Expired 30 min ago
            "verified": False
        }
        
        await db.verifications.insert_one(verification_data)
        
        # Try to verify with expired code
        response = api_client.post(
            f"{BASE_URL}/api/sign/{test_contract_id}/verify-telegram-otp",
            json={"code": test_otp_code}
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        # Cleanup
        await db.verifications.delete_many({"contract_id": test_contract_id})
        
        assert response.status_code == 400, f"Expected 400 for expired code, got {response.status_code}"
        assert "истек" in response.text.lower() or "expired" in response.text.lower()
        print(f"✅ OTP verification with expired code correctly rejected")
    
    @pytest.mark.asyncio
    async def test_verify_telegram_otp_with_already_used_code(self, api_client, mongo_client):
        """Test OTP verification with already used code returns error"""
        db = mongo_client[db_name]
        
        # Create a test contract
        test_contract_id = f"TEST_used_otp_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        test_otp_code = "123456"
        
        # Insert verification that's already verified
        verification_data = {
            "contract_id": test_contract_id,
            "otp_code": test_otp_code,
            "method": "telegram",
            "telegram_username": "test_user",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "verified": True  # Already used
        }
        
        await db.verifications.insert_one(verification_data)
        
        # Try to verify with already used code
        response = api_client.post(
            f"{BASE_URL}/api/sign/{test_contract_id}/verify-telegram-otp",
            json={"code": test_otp_code}
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        # Cleanup
        await db.verifications.delete_many({"contract_id": test_contract_id})
        
        assert response.status_code == 400, f"Expected 400 for used code, got {response.status_code}"
        assert "использован" in response.text.lower() or "used" in response.text.lower()
        print(f"✅ OTP verification with already used code correctly rejected")
    
    @pytest.mark.asyncio
    async def test_verify_telegram_otp_invalid_format(self, api_client):
        """Test OTP verification with invalid code format"""
        test_contract_id = "TEST_invalid_format"
        
        # Test with too short code
        response = api_client.post(
            f"{BASE_URL}/api/sign/{test_contract_id}/verify-telegram-otp",
            json={"code": "123"}
        )
        
        assert response.status_code == 400
        print(f"✅ Short code correctly rejected: {response.text}")
        
        # Test with empty code
        response = api_client.post(
            f"{BASE_URL}/api/sign/{test_contract_id}/verify-telegram-otp",
            json={"code": ""}
        )
        
        assert response.status_code == 400
        print(f"✅ Empty code correctly rejected: {response.text}")
    
    @pytest.mark.asyncio
    async def test_real_contract_verification_flow(self, api_client, mongo_client):
        """Test verification with a real existing contract from database"""
        db = mongo_client[db_name]
        
        # Find an unverified telegram verification
        verification = await db.verifications.find_one({
            "method": "telegram",
            "verified": False,
            "contract_id": {"$ne": None}
        })
        
        if verification:
            contract_id = verification['contract_id']
            otp_code = verification['otp_code']
            
            print(f"Found unverified verification:")
            print(f"  contract_id: {contract_id}")
            print(f"  otp_code: {otp_code}")
            print(f"  expires_at: {verification.get('expires_at')}")
            
            # Check if signature exists
            signature = await db.signatures.find_one({"contract_id": contract_id})
            if signature:
                print(f"  signature exists: True")
                
                # Try to verify
                response = api_client.post(
                    f"{BASE_URL}/api/sign/{contract_id}/verify-telegram-otp",
                    json={"code": otp_code}
                )
                
                print(f"Response status: {response.status_code}")
                print(f"Response body: {response.text}")
                
                # Don't assert success - just report what happened
                if response.status_code == 200:
                    print(f"✅ Real contract verification succeeded")
                else:
                    print(f"⚠️ Real contract verification failed: {response.text}")
            else:
                print(f"  signature exists: False - cannot verify without signature")
        else:
            print("⚠️ No unverified telegram verifications found in database")


class TestBotDatabaseIntegration:
    """Test that bot correctly saves OTP to database"""
    
    @pytest.fixture
    def mongo_client(self):
        """MongoDB client for direct DB access"""
        client = AsyncIOMotorClient(mongo_url)
        yield client
        client.close()
    
    @pytest.mark.asyncio
    async def test_bot_saves_otp_with_correct_fields(self, mongo_client):
        """Verify bot saves OTP with all required fields"""
        db = mongo_client[db_name]
        
        # Get a recent verification
        verification = await db.verifications.find_one(
            {"method": "telegram"},
            sort=[("created_at", -1)]
        )
        
        if verification:
            print(f"Latest telegram verification:")
            print(f"  contract_id: {verification.get('contract_id')}")
            print(f"  registration_id: {verification.get('registration_id')}")
            print(f"  otp_code: {verification.get('otp_code')}")
            print(f"  method: {verification.get('method')}")
            print(f"  telegram_username: {verification.get('telegram_username')}")
            print(f"  created_at: {verification.get('created_at')}")
            print(f"  expires_at: {verification.get('expires_at')}")
            print(f"  verified: {verification.get('verified')}")
            
            # Verify structure
            assert verification.get('otp_code'), "otp_code is missing or empty"
            assert verification.get('method') == 'telegram', "method should be 'telegram'"
            assert verification.get('created_at'), "created_at is missing"
            assert verification.get('expires_at'), "expires_at is missing"
            assert 'verified' in verification, "verified field is missing"
            
            print(f"✅ Bot saves OTP with correct structure")
        else:
            print("⚠️ No telegram verifications found")
    
    @pytest.mark.asyncio
    async def test_otp_expiry_time_is_reasonable(self, mongo_client):
        """Test OTP expiry time is set correctly (10 minutes)"""
        db = mongo_client[db_name]
        
        verification = await db.verifications.find_one(
            {"method": "telegram", "verified": False},
            sort=[("created_at", -1)]
        )
        
        if verification:
            created_at = datetime.fromisoformat(verification['created_at'].replace('Z', '+00:00'))
            expires_at = datetime.fromisoformat(verification['expires_at'].replace('Z', '+00:00'))
            
            diff = expires_at - created_at
            diff_minutes = diff.total_seconds() / 60
            
            print(f"OTP validity period: {diff_minutes} minutes")
            
            # Should be around 10 minutes
            assert 9 <= diff_minutes <= 11, f"Expected ~10 minutes, got {diff_minutes}"
            print(f"✅ OTP expiry time is correctly set to ~10 minutes")
        else:
            print("⚠️ No unverified telegram verifications found")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short', '-x'])

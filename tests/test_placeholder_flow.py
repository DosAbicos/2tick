"""
Test suite for placeholder replacement functionality in 2tick.kz contract platform.
Tests the full flow of:
1. Creating a contract with placeholders (PARTY_B_NAME, PARTY_B_IIN, PARTY_B_PHONE)
2. Filling placeholders by Party B during signing
3. Verifying placeholders are correctly displayed on ContractDetailsPage
4. Verifying signer_name, signer_phone are extracted from placeholder_values
"""

import pytest
import requests
import os
import json
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smtpemail-fix.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testadmin@test.kz"
TEST_PASSWORD = "admin123"

# Test data for Party B (signer)
TEST_PARTY_B_NAME = "Тестовый Подписант"
TEST_PARTY_B_IIN = "990101123456"
TEST_PARTY_B_PHONE = "+77001234567"
TEST_PARTY_B_EMAIL = "signer@test.kz"


class TestPlaceholderFlow:
    """Test placeholder replacement flow from contract creation to signing"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.contract_id = None
        self.signature_link = None
        
    def test_01_login(self):
        """Test login and get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        self.token = data["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print(f"✅ Login successful, user: {data['user']['email']}")
        return self.token
    
    def test_02_get_templates(self):
        """Test fetching templates with PARTY_B placeholders"""
        response = self.session.get(f"{BASE_URL}/api/templates")
        
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        templates = response.json()
        assert len(templates) > 0, "No templates found"
        
        # Find template with PARTY_B_NAME placeholder
        party_b_template = None
        for t in templates:
            placeholders = t.get('placeholders', {})
            if 'PARTY_B_NAME' in placeholders or 'NAME2' in placeholders:
                party_b_template = t
                break
        
        if party_b_template:
            print(f"✅ Found template with Party B placeholders: {party_b_template['id']}")
            print(f"   Placeholders: {list(party_b_template.get('placeholders', {}).keys())}")
        else:
            print("⚠️ No template with PARTY_B_NAME found, using test-template-001")
        
        return templates
    
    def test_03_create_contract_with_placeholders(self):
        """Create a contract using template with PARTY_B placeholders"""
        # First login
        token = self.test_01_login()
        
        # Use test-template-001 which has PARTY_B_NAME
        template_id = "test-template-001"
        
        # Create contract with landlord placeholders filled
        contract_data = {
            "title": f"Тестовый договор {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "content": "<h2>Договор аренды</h2><p>Арендодатель: {{PARTY_A_NAME}}</p><p>Арендатор: {{PARTY_B_NAME}}</p><p>ИИН: {{PARTY_B_IIN}}</p><p>Телефон: {{PARTY_B_PHONE}}</p>",
            "content_kk": "<h2>Жалдау келісімі</h2><p>Жалға беруші: {{PARTY_A_NAME}}</p><p>Жалға алушы: {{PARTY_B_NAME}}</p>",
            "content_en": "<h2>Rental Agreement</h2><p>Landlord: {{PARTY_A_NAME}}</p><p>Tenant: {{PARTY_B_NAME}}</p>",
            "template_id": template_id,
            "signer_name": "",  # Will be filled by signer
            "signer_phone": "+77000000000",  # Placeholder phone for sending
            "placeholder_values": {
                "CONTRACT_NUMBER": "TEST-001",
                "CONTRACT_DATE": datetime.now().strftime("%Y-%m-%d"),
                "PARTY_A_NAME": "ТОО Тестовая Компания",
                "START_DATE": "2025-01-01",
                "END_DATE": "2025-12-31",
                "AMOUNT": "100000"
                # PARTY_B_NAME, PARTY_B_IIN, PARTY_B_PHONE will be filled by signer
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=contract_data)
        
        assert response.status_code in [200, 201], f"Failed to create contract: {response.text}"
        contract = response.json()
        assert "id" in contract, "No contract ID in response"
        
        self.contract_id = contract["id"]
        print(f"✅ Contract created: {self.contract_id}")
        print(f"   Title: {contract.get('title')}")
        print(f"   Placeholder values: {contract.get('placeholder_values', {})}")
        
        return contract
    
    def test_04_send_contract_and_get_signature_link(self):
        """Send contract and get signature link"""
        # Create contract first
        contract = self.test_03_create_contract_with_placeholders()
        contract_id = contract["id"]
        
        # Send contract to get signature link
        response = self.session.post(f"{BASE_URL}/api/contracts/{contract_id}/send")
        
        assert response.status_code == 200, f"Failed to send contract: {response.text}"
        data = response.json()
        
        # Get updated contract with signature link
        response = self.session.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert response.status_code == 200
        contract = response.json()
        
        self.signature_link = contract.get("signature_link")
        assert self.signature_link, "No signature link generated"
        
        print(f"✅ Contract sent, signature link: {self.signature_link}")
        return contract
    
    def test_05_update_signer_info_with_party_b_placeholders(self):
        """Test updating signer info with PARTY_B placeholders"""
        # Create and send contract first
        contract = self.test_04_send_contract_and_get_signature_link()
        contract_id = contract["id"]
        
        # Simulate Party B filling in their information
        signer_data = {
            "placeholder_values": {
                "PARTY_B_NAME": TEST_PARTY_B_NAME,
                "PARTY_B_IIN": TEST_PARTY_B_IIN,
                "PARTY_B_PHONE": TEST_PARTY_B_PHONE,
                "PARTY_B_EMAIL": TEST_PARTY_B_EMAIL
            }
        }
        
        # Call update-signer-info endpoint (no auth required for signing)
        response = requests.post(
            f"{BASE_URL}/api/sign/{contract_id}/update-signer-info",
            json=signer_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Failed to update signer info: {response.text}"
        print(f"✅ Signer info updated with PARTY_B placeholders")
        
        # Verify the contract was updated
        response = self.session.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert response.status_code == 200
        updated_contract = response.json()
        
        # Check that signer_name was extracted from PARTY_B_NAME
        assert updated_contract.get("signer_name") == TEST_PARTY_B_NAME, \
            f"signer_name not extracted from PARTY_B_NAME. Got: {updated_contract.get('signer_name')}"
        
        # Check that signer_phone was extracted from PARTY_B_PHONE
        assert updated_contract.get("signer_phone") == TEST_PARTY_B_PHONE, \
            f"signer_phone not extracted from PARTY_B_PHONE. Got: {updated_contract.get('signer_phone')}"
        
        # Check placeholder_values were saved
        pv = updated_contract.get("placeholder_values", {})
        assert pv.get("PARTY_B_NAME") == TEST_PARTY_B_NAME, \
            f"PARTY_B_NAME not saved in placeholder_values. Got: {pv.get('PARTY_B_NAME')}"
        assert pv.get("PARTY_B_IIN") == TEST_PARTY_B_IIN, \
            f"PARTY_B_IIN not saved in placeholder_values. Got: {pv.get('PARTY_B_IIN')}"
        
        print(f"✅ Verified signer_name extracted: {updated_contract.get('signer_name')}")
        print(f"✅ Verified signer_phone extracted: {updated_contract.get('signer_phone')}")
        print(f"✅ Verified placeholder_values: {pv}")
        
        return updated_contract
    
    def test_06_verify_placeholder_display_in_contract_details(self):
        """Verify placeholders are correctly displayed when fetching contract details"""
        # Run the full flow
        updated_contract = self.test_05_update_signer_info_with_party_b_placeholders()
        contract_id = updated_contract["id"]
        
        # Fetch contract details (as would be done by ContractDetailsPage)
        response = self.session.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert response.status_code == 200
        contract = response.json()
        
        # Verify all Party B data is accessible
        pv = contract.get("placeholder_values", {})
        
        # These should be available for replacePlaceholders function
        assert contract.get("signer_name") or pv.get("PARTY_B_NAME"), \
            "Neither signer_name nor PARTY_B_NAME available for display"
        assert contract.get("signer_phone") or pv.get("PARTY_B_PHONE"), \
            "Neither signer_phone nor PARTY_B_PHONE available for display"
        
        print(f"✅ Contract details verification passed")
        print(f"   signer_name: {contract.get('signer_name')}")
        print(f"   signer_phone: {contract.get('signer_phone')}")
        print(f"   signer_iin: {contract.get('signer_iin')}")
        print(f"   PARTY_B_NAME in pv: {pv.get('PARTY_B_NAME')}")
        print(f"   PARTY_B_IIN in pv: {pv.get('PARTY_B_IIN')}")
        print(f"   PARTY_B_PHONE in pv: {pv.get('PARTY_B_PHONE')}")
        
        return contract
    
    def test_07_test_legacy_placeholder_keys(self):
        """Test that legacy placeholder keys (NAME2, PHONE_NUM, ID_CARD) also work"""
        # Login
        token = self.test_01_login()
        
        # Use the first template which uses NAME2, PHONE_NUM, ID_CARD
        template_id = "8223caf4-e8b3-42dc-af7c-df0225cae57a"
        
        # Create contract
        contract_data = {
            "title": f"Тестовый договор Legacy {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "content": "Меня зовут {{1NAME}}\nА меня зовут {{NAME2}}\nИИН: {{ID_CARD}}\nТелефон: {{PHONE_NUM}}",
            "template_id": template_id,
            "signer_name": "",
            "signer_phone": "+77000000001",
            "placeholder_values": {
                "1NAME": "Арендодатель Тестов",
                "ADDRESS": "г. Алматы, ул. Тестовая, 1"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=contract_data)
        assert response.status_code in [200, 201], f"Failed to create contract: {response.text}"
        contract = response.json()
        contract_id = contract["id"]
        
        # Send contract
        response = self.session.post(f"{BASE_URL}/api/contracts/{contract_id}/send")
        assert response.status_code == 200
        
        # Update with legacy keys
        signer_data = {
            "placeholder_values": {
                "NAME2": "Тестовый Арендатор",
                "ID_CARD": "880101654321",
                "PHONE_NUM": "+77009876543",
                "EMAIL": "legacy@test.kz"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sign/{contract_id}/update-signer-info",
            json=signer_data,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        # Verify extraction
        response = self.session.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert response.status_code == 200
        updated_contract = response.json()
        
        # Check that signer_name was extracted from NAME2
        assert updated_contract.get("signer_name") == "Тестовый Арендатор", \
            f"signer_name not extracted from NAME2. Got: {updated_contract.get('signer_name')}"
        
        # Check that signer_phone was extracted from PHONE_NUM
        assert updated_contract.get("signer_phone") == "+77009876543", \
            f"signer_phone not extracted from PHONE_NUM. Got: {updated_contract.get('signer_phone')}"
        
        print(f"✅ Legacy placeholder keys work correctly")
        print(f"   NAME2 -> signer_name: {updated_contract.get('signer_name')}")
        print(f"   PHONE_NUM -> signer_phone: {updated_contract.get('signer_phone')}")
        print(f"   ID_CARD -> signer_iin: {updated_contract.get('signer_iin')}")
        
        return updated_contract


class TestAPIEndpoints:
    """Test individual API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_health_check(self):
        """Test API health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ Health check passed")
    
    def test_templates_endpoint(self):
        """Test templates endpoint"""
        response = self.session.get(f"{BASE_URL}/api/templates")
        assert response.status_code == 200
        templates = response.json()
        assert isinstance(templates, list)
        print(f"✅ Templates endpoint returned {len(templates)} templates")
    
    def test_login_endpoint(self):
        """Test login endpoint"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✅ Login endpoint works, user: {data['user']['email']}")
    
    def test_contracts_endpoint_requires_auth(self):
        """Test that contracts endpoint requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/contracts")
        assert response.status_code == 401 or response.status_code == 403
        print("✅ Contracts endpoint correctly requires authentication")
    
    def test_update_signer_info_endpoint(self):
        """Test update-signer-info endpoint with invalid contract"""
        response = self.session.post(
            f"{BASE_URL}/api/sign/invalid-contract-id/update-signer-info",
            json={"placeholder_values": {"PARTY_B_NAME": "Test"}}
        )
        assert response.status_code == 404
        print("✅ update-signer-info correctly returns 404 for invalid contract")


class TestContractCreationFlow:
    """Test contract creation with different placeholder configurations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            token = response.json()["token"]
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_create_contract_without_template(self):
        """Test creating contract without template"""
        contract_data = {
            "title": f"Простой договор {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "content": "Простой текст договора без плейсхолдеров",
            "signer_name": "Тест Подписант",
            "signer_phone": "+77001112233"
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=contract_data)
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        contract = response.json()
        assert contract.get("signer_name") == "Тест Подписант"
        print(f"✅ Contract without template created: {contract['id']}")
    
    def test_create_contract_with_template_and_party_b_placeholders(self):
        """Test creating contract with template containing PARTY_B placeholders"""
        contract_data = {
            "title": f"Договор с PARTY_B {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "content": "Арендатор: {{PARTY_B_NAME}}, ИИН: {{PARTY_B_IIN}}, Тел: {{PARTY_B_PHONE}}",
            "template_id": "test-template-001",
            "signer_name": "",
            "signer_phone": "+77000000000",
            "placeholder_values": {
                "CONTRACT_NUMBER": "PARTY-B-TEST",
                "CONTRACT_DATE": "2025-01-01",
                "PARTY_A_NAME": "Арендодатель ТОО",
                "START_DATE": "2025-01-01",
                "END_DATE": "2025-12-31",
                "AMOUNT": "50000"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=contract_data)
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        contract = response.json()
        
        # Verify placeholder_values were saved
        pv = contract.get("placeholder_values", {})
        assert pv.get("CONTRACT_NUMBER") == "PARTY-B-TEST"
        assert pv.get("PARTY_A_NAME") == "Арендодатель ТОО"
        
        print(f"✅ Contract with PARTY_B placeholders created: {contract['id']}")
        print(f"   Placeholder values: {pv}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

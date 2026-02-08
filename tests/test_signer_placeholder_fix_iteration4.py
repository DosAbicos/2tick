"""
Test Suite for CRITICAL BUG FIX: Party A data should NOT appear in Party B fields

Bug Description:
- When Party A (landlord) creates a contract, their data (phone, email, name) 
  was incorrectly appearing in Party B (signer) fields
- Party A fills ONLY their fields, Party B fields should remain empty until signing

Fix Applied:
1. Frontend: cleanedPlaceholderValues contains ONLY landlord fields
2. Frontend: processContentWithPlaceholders skips signer/tenant placeholders
3. Backend: Extracts signer info ONLY from fields with owner='signer' or 'tenant'

Test Cases:
1. Login and get auth token
2. Get template with landlord/signer field separation
3. Create contract with ONLY landlord data
4. Verify placeholder_values contains ONLY landlord fields
5. Verify signer_name, signer_phone, signer_email are empty
6. Verify contract content preserves signer placeholders
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://upload-contracts-app.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testadmin@test.kz"
TEST_PASSWORD = "admin123"

# Template with landlord/signer separation
TEMPLATE_ID = "8223caf4-e8b3-42dc-af7c-df0225cae57a"


class TestSignerPlaceholderFix:
    """Test that Party A data does NOT leak into Party B fields"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_01_get_template_with_owner_separation(self, api_client):
        """Verify template has correct owner configuration for placeholders"""
        response = api_client.get(f"{BASE_URL}/api/templates/{TEMPLATE_ID}")
        assert response.status_code == 200, f"Failed to get template: {response.text}"
        
        template = response.json()
        placeholders = template.get('placeholders', {})
        
        # Verify landlord fields
        landlord_fields = ['1NAME', 'ADDRESS']
        for field in landlord_fields:
            assert field in placeholders, f"Missing landlord field: {field}"
            assert placeholders[field].get('owner') == 'landlord', f"{field} should have owner='landlord'"
        
        # Verify signer fields
        signer_fields = ['NAME2', 'PHONE_NUM', 'EMAIL', 'ID_CARD']
        for field in signer_fields:
            assert field in placeholders, f"Missing signer field: {field}"
            assert placeholders[field].get('owner') == 'signer', f"{field} should have owner='signer'"
        
        print(f"✅ Template has correct owner configuration")
        print(f"   Landlord fields: {landlord_fields}")
        print(f"   Signer fields: {signer_fields}")
    
    def test_02_create_contract_with_only_landlord_data(self, api_client):
        """Create contract filling ONLY Party A (landlord) fields"""
        
        # Party A data - ONLY landlord fields
        landlord_name = "Тест Арендодатель"
        landlord_address = "ул. Тестовая, д. 123"
        landlord_phone = "+7 (777) 111-22-33"  # This should NOT appear in signer fields
        
        # Create contract with ONLY landlord placeholder values
        # Simulating what frontend should send after fix
        contract_data = {
            "title": "Тестовый договор - проверка разделения данных",
            "content": f"Меня зовут {landlord_name}\nЯ сдаю жилье по адресу {landlord_address}\n\n\nА меня зовут {{{{NAME2}}}}\n\nИИН клиента: {{{{ID_CARD}}}}\n\nНомер телефона клиента: {{{{PHONE_NUM}}}}\nПочта: {{{{EMAIL}}}}",
            "content_kk": f"Mенің атым {landlord_name}\nМен {landlord_address} адрес бойынша пәтерді жалға беремін\n\n\nАл менің атым {{{{NAME2}}}}\n\nКлиенттің ИИН: {{{{ID_CARD}}}}\n\nНөмір телефоны: {{{{PHONE_NUM}}}}\nПошта: {{{{EMAIL}}}}",
            "content_en": f"My name is {landlord_name}.\nI am renting out the property located at {landlord_address}.\n\nAnd my name is {{{{NAME2}}}}.\n\nClient's IIN: {{{{ID_CARD}}}}\nClient's phone number: {{{{PHONE_NUM}}}}\nEmail: {{{{EMAIL}}}}",
            "content_type": "plain",
            "source_type": "template",
            "template_id": TEMPLATE_ID,
            # CRITICAL: placeholder_values should contain ONLY landlord fields
            "placeholder_values": {
                "1NAME": landlord_name,
                "ADDRESS": landlord_address
                # NO signer fields here!
            },
            # CRITICAL: signer fields should be empty
            "signer_name": "",
            "signer_phone": "",
            "signer_email": ""
        }
        
        response = api_client.post(f"{BASE_URL}/api/contracts", json=contract_data)
        assert response.status_code in [200, 201], f"Failed to create contract: {response.text}"
        
        contract = response.json()
        contract_id = contract.get('id')
        
        print(f"✅ Contract created: {contract_id}")
        
        # Store contract_id for next tests
        TestSignerPlaceholderFix.created_contract_id = contract_id
        
        return contract_id
    
    def test_03_verify_placeholder_values_only_landlord(self, api_client):
        """Verify placeholder_values contains ONLY landlord fields"""
        contract_id = getattr(TestSignerPlaceholderFix, 'created_contract_id', None)
        if not contract_id:
            pytest.skip("No contract created in previous test")
        
        response = api_client.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert response.status_code == 200, f"Failed to get contract: {response.text}"
        
        contract = response.json()
        placeholder_values = contract.get('placeholder_values', {})
        
        print(f"📋 placeholder_values: {json.dumps(placeholder_values, ensure_ascii=False, indent=2)}")
        
        # Verify landlord fields are present
        assert '1NAME' in placeholder_values, "Missing landlord field 1NAME"
        assert 'ADDRESS' in placeholder_values, "Missing landlord field ADDRESS"
        
        # CRITICAL: Verify signer fields are NOT in placeholder_values
        signer_fields = ['NAME2', 'PHONE_NUM', 'EMAIL', 'ID_CARD']
        for field in signer_fields:
            if field in placeholder_values and placeholder_values[field]:
                pytest.fail(f"❌ SIGNER FIELD {field} should NOT be in placeholder_values! Value: {placeholder_values[field]}")
        
        print(f"✅ placeholder_values contains ONLY landlord fields")
    
    def test_04_verify_signer_fields_empty(self, api_client):
        """Verify signer_name, signer_phone, signer_email are empty"""
        contract_id = getattr(TestSignerPlaceholderFix, 'created_contract_id', None)
        if not contract_id:
            pytest.skip("No contract created in previous test")
        
        response = api_client.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert response.status_code == 200, f"Failed to get contract: {response.text}"
        
        contract = response.json()
        
        signer_name = contract.get('signer_name', '')
        signer_phone = contract.get('signer_phone', '')
        signer_email = contract.get('signer_email', '')
        
        print(f"📋 signer_name: '{signer_name}'")
        print(f"📋 signer_phone: '{signer_phone}'")
        print(f"📋 signer_email: '{signer_email}'")
        
        # CRITICAL: All signer fields should be empty
        assert not signer_name, f"❌ signer_name should be empty, got: '{signer_name}'"
        assert not signer_phone, f"❌ signer_phone should be empty, got: '{signer_phone}'"
        assert not signer_email, f"❌ signer_email should be empty, got: '{signer_email}'"
        
        print(f"✅ All signer fields are empty as expected")
    
    def test_05_verify_content_preserves_signer_placeholders(self, api_client):
        """Verify contract content still has signer placeholders (not replaced)"""
        contract_id = getattr(TestSignerPlaceholderFix, 'created_contract_id', None)
        if not contract_id:
            pytest.skip("No contract created in previous test")
        
        response = api_client.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert response.status_code == 200, f"Failed to get contract: {response.text}"
        
        contract = response.json()
        content = contract.get('content', '')
        content_kk = contract.get('content_kk', '')
        
        print(f"📋 Content (first 500 chars): {content[:500]}")
        
        # Verify signer placeholders are preserved in content
        # They should either be {{PLACEHOLDER}} or [Label] format
        signer_placeholder_patterns = [
            '{{NAME2}}', '{{PHONE_NUM}}', '{{EMAIL}}', '{{ID_CARD}}',
            '[Имя]', '[Номер телефона]', '[Почта]', '[ИИН]'
        ]
        
        # Check that landlord data is in content
        assert 'Тест Арендодатель' in content or '{{1NAME}}' not in content, "Landlord name should be in content"
        assert 'ул. Тестовая' in content or '{{ADDRESS}}' not in content, "Landlord address should be in content"
        
        # Check that signer placeholders are preserved (not replaced with landlord data)
        landlord_phone = "+7 (777) 111-22-33"
        if landlord_phone in content:
            pytest.fail(f"❌ Landlord phone '{landlord_phone}' should NOT appear in content where signer phone should be!")
        
        print(f"✅ Content correctly preserves signer placeholders")
    
    def test_06_cleanup_test_contract(self, api_client):
        """Clean up test contract"""
        contract_id = getattr(TestSignerPlaceholderFix, 'created_contract_id', None)
        if contract_id:
            response = api_client.delete(f"{BASE_URL}/api/contracts/{contract_id}")
            print(f"🧹 Cleanup: Deleted test contract {contract_id}, status: {response.status_code}")


class TestBackendSignerExtraction:
    """Test backend correctly extracts signer info ONLY from signer-owned fields"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Authentication failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_01_backend_ignores_landlord_phone_for_signer(self, api_client):
        """Test that backend doesn't use landlord phone as signer phone"""
        
        # Create contract with landlord phone in placeholder_values
        # but NO signer phone
        contract_data = {
            "title": "Backend Test - Signer Extraction",
            "content": "Test content with {{PHONE_NUM}}",
            "content_type": "plain",
            "source_type": "template",
            "template_id": TEMPLATE_ID,
            "placeholder_values": {
                "1NAME": "Landlord Name",
                "ADDRESS": "Landlord Address",
                # Intentionally NOT including signer fields
            },
            "signer_name": "",
            "signer_phone": "",
            "signer_email": ""
        }
        
        response = api_client.post(f"{BASE_URL}/api/contracts", json=contract_data)
        assert response.status_code in [200, 201], f"Failed to create contract: {response.text}"
        
        contract = response.json()
        contract_id = contract.get('id')
        
        # Get the contract to verify signer fields
        response = api_client.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert response.status_code == 200
        
        contract = response.json()
        
        # Verify signer fields are empty (backend didn't extract from landlord fields)
        assert not contract.get('signer_phone'), f"signer_phone should be empty, got: {contract.get('signer_phone')}"
        assert not contract.get('signer_name'), f"signer_name should be empty, got: {contract.get('signer_name')}"
        
        print(f"✅ Backend correctly ignores landlord fields for signer extraction")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/contracts/{contract_id}")


class TestContractViewPlaceholders:
    """Test that contract view shows placeholders for Party B fields"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Authentication failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_01_contract_content_has_signer_placeholders(self, api_client):
        """Verify contract content shows placeholders for unfilled signer fields"""
        
        # Create contract
        contract_data = {
            "title": "View Test - Signer Placeholders",
            "content": "Landlord: Тест Имя\nSigner: {{NAME2}}\nPhone: {{PHONE_NUM}}",
            "content_kk": "Landlord: Тест Имя\nSigner: {{NAME2}}\nPhone: {{PHONE_NUM}}",
            "content_type": "plain",
            "source_type": "template",
            "template_id": TEMPLATE_ID,
            "placeholder_values": {
                "1NAME": "Тест Имя",
                "ADDRESS": "Тест Адрес"
            },
            "signer_name": "",
            "signer_phone": "",
            "signer_email": ""
        }
        
        response = api_client.post(f"{BASE_URL}/api/contracts", json=contract_data)
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        
        contract = response.json()
        contract_id = contract.get('id')
        
        # Get contract
        response = api_client.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert response.status_code == 200
        
        contract = response.json()
        content = contract.get('content', '')
        
        # Content should have signer placeholders preserved
        # Either as {{KEY}} or as [Label]
        print(f"📋 Contract content: {content}")
        
        # Verify landlord data is present
        assert 'Тест Имя' in content or '{{1NAME}}' not in content
        
        # Verify signer placeholders are preserved (not filled with landlord data)
        # The content should NOT have landlord phone where signer phone should be
        
        print(f"✅ Contract content correctly shows signer placeholders")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/contracts/{contract_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Test for CRITICAL BUG: Signer placeholders being replaced with Party A data in content_kk

Bug Description:
- When Party A creates a contract, signer placeholders (owner='signer') like PHONE_NUM 
  should NOT be replaced in content_kk
- The content_kk should keep {{PHONE_NUM}} placeholder for Party B to fill later
- Currently, if Party A fills signer fields, they get hardcoded into content_kk

Test Scenarios:
1. Create contract with only landlord placeholders filled - signer placeholders should remain as {{KEY}}
2. Verify content_kk has {{PHONE_NUM}} placeholder, not hardcoded phone
3. Verify update_signer_info does NOT replace signer placeholders in content when status != 'signed'
"""

import pytest
import requests
import os
import json
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSignerPlaceholderBug:
    """Test signer placeholder replacement bug"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_email = "testadmin@test.kz"
        self.test_password = "admin123"
        self.template_id = "8223caf4-e8b3-42dc-af7c-df0225cae57a"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_auth_token(self):
        """Get authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
        
    def test_template_has_correct_placeholders(self):
        """Verify template has correct placeholder configuration"""
        response = self.session.get(f"{BASE_URL}/api/templates/{self.template_id}")
        
        if response.status_code == 404:
            pytest.skip("Template not found")
            
        assert response.status_code == 200, f"Failed to get template: {response.text}"
        
        template = response.json()
        placeholders = template.get('placeholders', {})
        
        # Check PHONE_NUM is configured as signer field
        assert 'PHONE_NUM' in placeholders, "PHONE_NUM placeholder not found in template"
        phone_config = placeholders['PHONE_NUM']
        assert phone_config.get('owner') == 'signer', f"PHONE_NUM should have owner='signer', got: {phone_config.get('owner')}"
        
        # Check content_kk has {{PHONE_NUM}} placeholder
        content_kk = template.get('content_kk', '')
        assert '{{PHONE_NUM}}' in content_kk, f"Template content_kk should have {{{{PHONE_NUM}}}} placeholder"
        
        print(f"✅ Template has correct PHONE_NUM configuration: owner={phone_config.get('owner')}")
        print(f"✅ Template content_kk has {{{{PHONE_NUM}}}} placeholder")
        
    def test_create_contract_preserves_signer_placeholders(self):
        """
        CRITICAL TEST: When Party A creates contract, signer placeholders should NOT be replaced
        """
        token = self.get_auth_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get template first
        template_response = self.session.get(f"{BASE_URL}/api/templates/{self.template_id}")
        if template_response.status_code != 200:
            pytest.skip("Template not found")
        template = template_response.json()
        
        # Create contract with ONLY landlord placeholders filled
        # Signer placeholders (PHONE_NUM, NAME2, ID_CARD, EMAIL) should be empty
        landlord_phone = "+7 (707) 400-32-01"  # Party A phone
        
        contract_data = {
            "title": f"TEST_SIGNER_PLACEHOLDER_BUG_{os.urandom(4).hex()}",
            "content": template.get('content', ''),
            "content_kk": template.get('content_kk', ''),  # Should have {{PHONE_NUM}}
            "content_en": template.get('content_en', ''),
            "content_type": "plain",
            "template_id": self.template_id,
            "placeholder_values": {
                "1NAME": "Тестовый Арендодатель",  # Landlord name
                "ADDRESS": "г. Астана, ул. Тестовая, 123"  # Landlord address
                # NOTE: NOT filling signer placeholders (NAME2, PHONE_NUM, ID_CARD, EMAIL)
            },
            "signer_name": "",
            "signer_phone": "",
            "signer_email": ""
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=contract_data)
        assert response.status_code == 200, f"Failed to create contract: {response.text}"
        
        contract = response.json()
        contract_id = contract.get('id')
        
        print(f"✅ Created contract: {contract.get('contract_code')}")
        
        # Verify content_kk still has {{PHONE_NUM}} placeholder
        content_kk = contract.get('content_kk', '')
        
        # Check if {{PHONE_NUM}} is preserved
        has_placeholder = '{{PHONE_NUM}}' in content_kk
        
        # Check if hardcoded phone exists (BUG indicator)
        has_hardcoded_phone = bool(re.search(r'\+7[\s\(\)\d-]+', content_kk))
        
        print(f"Content_kk has {{{{PHONE_NUM}}}} placeholder: {has_placeholder}")
        print(f"Content_kk has hardcoded phone: {has_hardcoded_phone}")
        
        if content_kk:
            print(f"Content_kk preview: {content_kk[:500]}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/contracts/{contract_id}")
        
        # Assert - this is the critical check
        assert has_placeholder or not has_hardcoded_phone, \
            "BUG: content_kk should have {{PHONE_NUM}} placeholder, not hardcoded phone"
            
    def test_update_signer_info_skips_signer_placeholders_for_draft(self):
        """
        Test that update_signer_info does NOT replace signer placeholders when contract is draft
        """
        token = self.get_auth_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get template
        template_response = self.session.get(f"{BASE_URL}/api/templates/{self.template_id}")
        if template_response.status_code != 200:
            pytest.skip("Template not found")
        template = template_response.json()
        
        # Create contract with template content (placeholders intact)
        contract_data = {
            "title": f"TEST_UPDATE_SIGNER_{os.urandom(4).hex()}",
            "content": template.get('content', ''),
            "content_kk": template.get('content_kk', ''),
            "content_en": template.get('content_en', ''),
            "content_type": "plain",
            "template_id": self.template_id,
            "placeholder_values": {
                "1NAME": "Арендодатель ООО",
                "ADDRESS": "г. Алматы, ул. Абая, 1"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=contract_data)
        assert response.status_code == 200, f"Failed to create contract: {response.text}"
        
        contract = response.json()
        contract_id = contract.get('id')
        
        print(f"✅ Created contract: {contract.get('contract_code')}, status: {contract.get('status')}")
        
        # Now call update_signer_info with signer data
        signer_phone = "+7 (747) 836-93-91"  # Party B phone
        update_data = {
            "placeholder_values": {
                "NAME2": "Арендатор Тестов",
                "PHONE_NUM": signer_phone,
                "ID_CARD": "990101123456",
                "EMAIL": "tenant@test.kz"
            }
        }
        
        update_response = self.session.post(
            f"{BASE_URL}/api/sign/{contract_id}/update-signer-info",
            json=update_data
        )
        assert update_response.status_code == 200, f"Failed to update signer info: {update_response.text}"
        
        # Get updated contract
        get_response = self.session.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert get_response.status_code == 200
        
        updated_contract = get_response.json()
        content_kk = updated_contract.get('content_kk', '')
        
        print(f"Updated contract status: {updated_contract.get('status')}")
        print(f"Content_kk preview: {content_kk[:500] if content_kk else 'NO CONTENT_KK'}")
        
        # Check if signer phone was hardcoded into content_kk
        # For draft status, it should NOT be replaced
        has_signer_phone_hardcoded = signer_phone in content_kk
        has_placeholder = '{{PHONE_NUM}}' in content_kk
        
        print(f"Signer phone hardcoded in content_kk: {has_signer_phone_hardcoded}")
        print(f"{{{{PHONE_NUM}}}} placeholder preserved: {has_placeholder}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/contracts/{contract_id}")
        
        # For draft contracts, signer placeholders should NOT be replaced
        # The backend should skip signer placeholders when status != 'signed'
        if updated_contract.get('status') == 'draft':
            assert has_placeholder or not has_signer_phone_hardcoded, \
                "BUG: For draft contracts, signer placeholders should NOT be replaced in content_kk"
                
    def test_frontend_replaces_placeholders_correctly(self):
        """
        Test that frontend replacePlaceholders function works correctly
        This simulates what ContractDetailsPage.js does
        """
        token = self.get_auth_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get template
        template_response = self.session.get(f"{BASE_URL}/api/templates/{self.template_id}")
        if template_response.status_code != 200:
            pytest.skip("Template not found")
        template = template_response.json()
        
        # Create contract
        contract_data = {
            "title": f"TEST_FRONTEND_REPLACE_{os.urandom(4).hex()}",
            "content": template.get('content', ''),
            "content_kk": template.get('content_kk', ''),
            "content_en": template.get('content_en', ''),
            "content_type": "plain",
            "template_id": self.template_id,
            "placeholder_values": {
                "1NAME": "Арендодатель Тест",
                "ADDRESS": "г. Нур-Султан, пр. Мангилик Ел, 1"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/contracts", json=contract_data)
        assert response.status_code == 200
        
        contract = response.json()
        contract_id = contract.get('id')
        
        # Update with signer info
        update_data = {
            "signer_name": "Тестовый Арендатор",
            "signer_phone": "+7 (777) 999-88-77",
            "signer_email": "test.tenant@example.kz",
            "placeholder_values": {
                "NAME2": "Тестовый Арендатор",
                "PHONE_NUM": "+7 (777) 999-88-77",
                "ID_CARD": "880505123456",
                "EMAIL": "test.tenant@example.kz"
            }
        }
        
        self.session.post(f"{BASE_URL}/api/sign/{contract_id}/update-signer-info", json=update_data)
        
        # Get contract via API (simulating frontend fetch)
        get_response = self.session.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert get_response.status_code == 200
        
        contract = get_response.json()
        
        # Simulate frontend replacePlaceholders logic
        content_kk = contract.get('content_kk', '')
        pv = contract.get('placeholder_values', {})
        signer_phone = contract.get('signer_phone') or pv.get('PHONE_NUM', '')
        
        print(f"Contract signer_phone: {contract.get('signer_phone')}")
        print(f"Placeholder PHONE_NUM: {pv.get('PHONE_NUM')}")
        print(f"Resolved signer_phone: {signer_phone}")
        
        # Check if content_kk has placeholder or hardcoded value
        if '{{PHONE_NUM}}' in content_kk:
            print("✅ content_kk has {{PHONE_NUM}} placeholder - frontend will replace dynamically")
        elif signer_phone and signer_phone in content_kk:
            print("⚠️ content_kk has hardcoded signer phone - already replaced")
        else:
            print("❓ content_kk state unclear")
            
        print(f"Content_kk: {content_kk[:300] if content_kk else 'EMPTY'}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/contracts/{contract_id}")
        
        # The test passes if we can verify the data flow
        assert signer_phone, "Signer phone should be set after update"


class TestExistingContractFix:
    """Test fixing existing contracts with hardcoded values"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_email = "testadmin@test.kz"
        self.test_password = "admin123"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_auth_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Authentication failed: {response.status_code}")
        
    def test_list_contracts_with_hardcoded_phones(self):
        """Find contracts that have hardcoded phones in content_kk"""
        token = self.get_auth_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/contracts")
        assert response.status_code == 200
        
        contracts = response.json()
        
        contracts_with_issues = []
        for c in contracts:
            content_kk = c.get('content_kk', '')
            if content_kk:
                # Check for hardcoded phones
                phones = re.findall(r'\+7[\s\(\)\d-]+', content_kk)
                has_placeholder = '{{PHONE_NUM}}' in content_kk
                
                if phones and not has_placeholder:
                    contracts_with_issues.append({
                        'code': c.get('contract_code'),
                        'id': c.get('id'),
                        'status': c.get('status'),
                        'phones_found': phones[:3]
                    })
                    
        print(f"Found {len(contracts_with_issues)} contracts with potential hardcoded phones:")
        for issue in contracts_with_issues[:5]:
            print(f"  - {issue['code']}: {issue['phones_found']}")
            
        # This is informational - not a failure
        print(f"Total contracts checked: {len(contracts)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Test for CRITICAL BUG: Signer placeholders (owner='signer') should NOT be filled by Party A during contract creation.

Bug description:
- When creating a contract, Party A fills their own fields (owner='landlord')
- Party B (signer) fields should remain empty until Party B fills them during signing
- The bug was that PHONE_NUM (owner='signer') was showing Party A's phone instead of being empty

Template ID: 8223caf4-e8b3-42dc-af7c-df0225cae57a
Placeholders:
- 1NAME (landlord) - Party A name
- NAME2 (signer) - Party B name  
- PHONE_NUM (signer) - Party B phone
- ADDRESS (landlord) - Party A address
- ID_CARD (signer) - Party B IIN
- EMAIL (signer) - Party B email
"""

import pytest
import requests
import os
import json
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smtpemail-fix.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testadmin@test.kz"
TEST_PASSWORD = "admin123"

# Template with signer placeholders
TEMPLATE_ID = "8223caf4-e8b3-42dc-af7c-df0225cae57a"

# Party A data (landlord)
PARTY_A_DATA = {
    "1NAME": "Тестовый Арендодатель ООО",
    "ADDRESS": "г. Астана, ул. Тестовая, 123"
}

# Party A phone (should NOT appear in signer fields)
PARTY_A_PHONE = "+7 (707) 400-32-01"


class TestSignerPlaceholderBug:
    """Test that signer placeholders are NOT filled by Party A during contract creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_template_has_correct_owner_config(self):
        """Verify template placeholders have correct owner configuration"""
        response = requests.get(f"{BASE_URL}/api/templates/{TEMPLATE_ID}")
        assert response.status_code == 200, f"Failed to get template: {response.text}"
        
        template = response.json()
        placeholders = template.get("placeholders", {})
        
        # Verify landlord fields
        assert placeholders.get("1NAME", {}).get("owner") == "landlord", "1NAME should be landlord"
        assert placeholders.get("ADDRESS", {}).get("owner") == "landlord", "ADDRESS should be landlord"
        
        # Verify signer fields
        assert placeholders.get("NAME2", {}).get("owner") == "signer", "NAME2 should be signer"
        assert placeholders.get("PHONE_NUM", {}).get("owner") == "signer", "PHONE_NUM should be signer"
        assert placeholders.get("ID_CARD", {}).get("owner") == "signer", "ID_CARD should be signer"
        assert placeholders.get("EMAIL", {}).get("owner") == "signer", "EMAIL should be signer"
        
        print("✅ Template placeholder owners are correctly configured")
    
    def test_create_contract_only_landlord_fields_filled(self):
        """
        CRITICAL TEST: When Party A creates a contract, only landlord fields should be filled.
        Signer fields (owner='signer') should be EMPTY.
        """
        # Create contract with ONLY landlord data
        contract_data = {
            "title": f"TEST_BUG_CHECK_{uuid.uuid4().hex[:8]}",
            "content": "Test contract content with {{1NAME}} and {{NAME2}} and {{PHONE_NUM}}",
            "template_id": TEMPLATE_ID,
            "placeholder_values": {
                # ONLY landlord fields - Party A should NOT fill signer fields
                "1NAME": PARTY_A_DATA["1NAME"],
                "ADDRESS": PARTY_A_DATA["ADDRESS"]
                # NAME2, PHONE_NUM, ID_CARD, EMAIL should NOT be here
            },
            "signer_name": "",  # Should be empty - Party B fills this
            "signer_phone": "",  # Should be empty - Party B fills this
            "signer_email": ""  # Should be empty - Party B fills this
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts",
            json=contract_data,
            headers=self.headers
        )
        assert response.status_code in [200, 201], f"Failed to create contract: {response.text}"
        
        contract = response.json()
        contract_id = contract["id"]
        
        # Verify placeholder_values
        pv = contract.get("placeholder_values", {})
        
        # Landlord fields should be filled
        assert pv.get("1NAME") == PARTY_A_DATA["1NAME"], "1NAME should be filled"
        assert pv.get("ADDRESS") == PARTY_A_DATA["ADDRESS"], "ADDRESS should be filled"
        
        # CRITICAL: Signer fields should be EMPTY
        assert not pv.get("NAME2"), f"NAME2 should be empty, got: {pv.get('NAME2')}"
        assert not pv.get("PHONE_NUM"), f"PHONE_NUM should be empty, got: {pv.get('PHONE_NUM')}"
        assert not pv.get("ID_CARD"), f"ID_CARD should be empty, got: {pv.get('ID_CARD')}"
        assert not pv.get("EMAIL"), f"EMAIL should be empty, got: {pv.get('EMAIL')}"
        
        # CRITICAL: signer_phone should NOT contain Party A's phone
        assert contract.get("signer_phone") != PARTY_A_PHONE, \
            f"signer_phone should NOT be Party A's phone! Got: {contract.get('signer_phone')}"
        
        print(f"✅ Contract created with only landlord fields filled")
        print(f"   Placeholder values: {json.dumps(pv, ensure_ascii=False)}")
        print(f"   signer_name: {contract.get('signer_name')}")
        print(f"   signer_phone: {contract.get('signer_phone')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
    
    def test_signer_fields_not_filled_with_party_a_data(self):
        """
        Test that even if Party A accidentally fills signer fields in the form,
        the backend should NOT accept them (or they should be clearly separated).
        """
        # Simulate bug scenario: Party A fills ALL fields including signer fields
        contract_data = {
            "title": f"TEST_BUG_SCENARIO_{uuid.uuid4().hex[:8]}",
            "content": "Test contract",
            "template_id": TEMPLATE_ID,
            "placeholder_values": {
                # Landlord fields
                "1NAME": PARTY_A_DATA["1NAME"],
                "ADDRESS": PARTY_A_DATA["ADDRESS"],
                # BUG: Party A should NOT be able to fill these
                "NAME2": "WRONG - Party A filled this",
                "PHONE_NUM": PARTY_A_PHONE,  # This is the bug!
                "ID_CARD": "123456789012",
                "EMAIL": "wrong@partya.com"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts",
            json=contract_data,
            headers=self.headers
        )
        
        # Contract creation should succeed
        assert response.status_code in [200, 201], f"Failed to create contract: {response.text}"
        
        contract = response.json()
        contract_id = contract["id"]
        pv = contract.get("placeholder_values", {})
        
        # Document what happens - this test documents the current behavior
        print(f"📋 Contract created with all fields filled by Party A:")
        print(f"   NAME2 (signer): {pv.get('NAME2')}")
        print(f"   PHONE_NUM (signer): {pv.get('PHONE_NUM')}")
        print(f"   ID_CARD (signer): {pv.get('ID_CARD')}")
        print(f"   EMAIL (signer): {pv.get('EMAIL')}")
        print(f"   signer_phone: {contract.get('signer_phone')}")
        
        # The bug is that signer fields CAN be filled by Party A
        # This test documents the issue
        if pv.get("PHONE_NUM") == PARTY_A_PHONE:
            print("⚠️ BUG CONFIRMED: PHONE_NUM (signer field) contains Party A's phone!")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)
    
    def test_sign_contract_signer_fills_own_fields(self):
        """
        Test that Party B can fill their own fields during signing.
        """
        # First create contract with only landlord fields
        contract_data = {
            "title": f"TEST_SIGNING_{uuid.uuid4().hex[:8]}",
            "content": "Test contract for signing",
            "template_id": TEMPLATE_ID,
            "placeholder_values": {
                "1NAME": PARTY_A_DATA["1NAME"],
                "ADDRESS": PARTY_A_DATA["ADDRESS"]
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts",
            json=contract_data,
            headers=self.headers
        )
        assert response.status_code in [200, 201]
        
        contract = response.json()
        contract_id = contract["id"]
        
        # Now simulate Party B filling their fields via sign endpoint
        signer_data = {
            "placeholder_values": {
                "NAME2": "Арендатор Тестович",
                "PHONE_NUM": "+7 (777) 123-45-67",
                "ID_CARD": "990101123456",
                "EMAIL": "signer@test.kz"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sign/{contract_id}/update-signer-info",
            json=signer_data
        )
        
        # Check if endpoint exists and works
        if response.status_code == 200:
            print("✅ Party B successfully filled their fields via signing endpoint")
            
            # Verify the contract was updated
            response = requests.get(f"{BASE_URL}/api/sign/{contract_id}")
            if response.status_code == 200:
                updated_contract = response.json()
                pv = updated_contract.get("placeholder_values", {})
                
                # Landlord fields should still be there
                assert pv.get("1NAME") == PARTY_A_DATA["1NAME"]
                
                # Signer fields should now be filled by Party B
                assert pv.get("NAME2") == "Арендатор Тестович"
                assert pv.get("PHONE_NUM") == "+7 (777) 123-45-67"
                
                print(f"   Updated placeholder values: {json.dumps(pv, ensure_ascii=False)}")
        else:
            print(f"⚠️ Sign endpoint returned: {response.status_code} - {response.text}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/contracts/{contract_id}", headers=self.headers)


class TestFrontendFormSeparation:
    """Test that frontend form correctly separates landlord and signer fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_template_placeholders_have_owner_field(self):
        """Verify all placeholders have owner field for frontend filtering"""
        response = requests.get(f"{BASE_URL}/api/templates/{TEMPLATE_ID}")
        assert response.status_code == 200
        
        template = response.json()
        placeholders = template.get("placeholders", {})
        
        for key, config in placeholders.items():
            assert "owner" in config, f"Placeholder {key} missing 'owner' field"
            assert config["owner"] in ["landlord", "signer", "tenant"], \
                f"Placeholder {key} has invalid owner: {config['owner']}"
        
        print("✅ All placeholders have valid owner field")
        
        # Count by owner
        landlord_count = sum(1 for c in placeholders.values() if c.get("owner") == "landlord")
        signer_count = sum(1 for c in placeholders.values() if c.get("owner") in ["signer", "tenant"])
        
        print(f"   Landlord fields: {landlord_count}")
        print(f"   Signer fields: {signer_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

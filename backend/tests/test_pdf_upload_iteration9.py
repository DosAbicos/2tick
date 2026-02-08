"""
Test suite for PDF Upload feature - Iteration 9
Tests the new template-like flow for PDF contracts
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://upload-contracts-app.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# Test credentials
TEST_EMAIL = "admin@2tick.kz"
TEST_PASSWORD = "142314231423"

class TestPDFUploadFlow:
    """Test the new PDF upload flow that works like templates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        response = requests.post(f"{API}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.user = response.json()["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_upload_pdf_creates_draft_status(self):
        """Test that uploading PDF creates contract with status 'draft' (not 'sent')"""
        # Create a minimal test PDF
        pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
trailer << /Size 4 /Root 1 0 R >>
startxref
0
%%EOF"""
        
        files = {"file": ("test_contract.pdf", pdf_content, "application/pdf")}
        data = {
            "title": "TEST_Draft_Status_Contract",
            "landlord_name": "Test Company",
            "landlord_email": "test@test.com",
            "landlord_phone": "+7 777 777 7777"
        }
        
        response = requests.post(
            f"{API}/contracts/upload-pdf",
            files=files,
            data=data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        
        assert "contract_id" in result, "Response missing contract_id"
        assert "signature_link" in result, "Response missing signature_link"
        
        contract_id = result["contract_id"]
        
        # Verify contract status is 'draft'
        contract_response = requests.get(
            f"{API}/contracts/{contract_id}",
            headers=self.headers
        )
        
        assert contract_response.status_code == 200, f"Failed to get contract: {contract_response.text}"
        contract = contract_response.json()
        
        # KEY ASSERTION: Status should be 'draft', not 'sent'
        assert contract["status"] == "draft", f"Expected status 'draft', got '{contract['status']}'"
        assert contract["source_type"] == "uploaded_pdf", f"Expected source_type 'uploaded_pdf', got '{contract['source_type']}'"
        
        print(f"✅ Contract created with status: {contract['status']}")
        return contract_id
    
    def test_02_party_a_data_saved(self):
        """Test that Party A (landlord) data is saved correctly"""
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj xref\n0 4\ntrailer<</Size 4/Root 1 0 R>>startxref\n0\n%%EOF"
        
        test_landlord_data = {
            "landlord_name": "TEST_Company_ABC",
            "landlord_iin": "123456789012",
            "landlord_phone": "+7 777 111 2222",
            "landlord_email": "landlord@test.com",
            "landlord_address": "Test Address 123"
        }
        
        files = {"file": ("test.pdf", pdf_content, "application/pdf")}
        data = {
            "title": "TEST_PartyA_Data_Contract",
            **test_landlord_data
        }
        
        response = requests.post(
            f"{API}/contracts/upload-pdf",
            files=files,
            data=data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        contract_id = response.json()["contract_id"]
        
        # Verify Party A data
        contract_response = requests.get(
            f"{API}/contracts/{contract_id}",
            headers=self.headers
        )
        contract = contract_response.json()
        
        assert contract["landlord_name"] == test_landlord_data["landlord_name"]
        assert contract["landlord_iin_bin"] == test_landlord_data["landlord_iin"]
        assert contract["landlord_phone"] == test_landlord_data["landlord_phone"]
        assert contract["landlord_email"] == test_landlord_data["landlord_email"]
        
        print("✅ Party A data saved correctly")
    
    def test_03_party_b_optional(self):
        """Test that Party B data is optional"""
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj trailer<</Root 1 0 R>>%%EOF"
        
        files = {"file": ("test.pdf", pdf_content, "application/pdf")}
        data = {
            "title": "TEST_PartyB_Optional_Contract",
            "landlord_name": "Test Company",
            # No Party B data provided
        }
        
        response = requests.post(
            f"{API}/contracts/upload-pdf",
            files=files,
            data=data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Upload should succeed without Party B data: {response.text}"
        
        contract_id = response.json()["contract_id"]
        
        # Verify contract created without Party B data
        contract_response = requests.get(
            f"{API}/contracts/{contract_id}",
            headers=self.headers
        )
        contract = contract_response.json()
        
        # Party B fields should be empty
        assert contract["signer_name"] == "" or contract["signer_name"] is None
        
        print("✅ Party B data is optional (contract created without it)")
    
    def test_04_sign_page_accessible(self):
        """Test that sign page is accessible for uploaded PDF contracts"""
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj xref\n0 4\ntrailer<</Size 4/Root 1 0 R>>startxref\n0\n%%EOF"
        
        files = {"file": ("test.pdf", pdf_content, "application/pdf")}
        data = {
            "title": "TEST_SignPage_Access_Contract",
            "landlord_name": "Test Company"
        }
        
        response = requests.post(
            f"{API}/contracts/upload-pdf",
            files=files,
            data=data,
            headers=self.headers
        )
        
        assert response.status_code == 200
        contract_id = response.json()["contract_id"]
        
        # Access sign page (public endpoint)
        sign_response = requests.get(f"{API}/sign/{contract_id}")
        
        assert sign_response.status_code == 200, f"Sign page not accessible: {sign_response.text}"
        
        contract = sign_response.json()
        assert contract["source_type"] == "uploaded_pdf"
        
        print("✅ Sign page accessible for PDF contracts")
    
    def test_05_pdf_view_endpoint(self):
        """Test that PDF can be viewed on sign page"""
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj xref\n0 4\ntrailer<</Size 4/Root 1 0 R>>startxref\n0\n%%EOF"
        
        files = {"file": ("test.pdf", pdf_content, "application/pdf")}
        data = {
            "title": "TEST_PDF_View_Contract",
            "landlord_name": "Test Company"
        }
        
        response = requests.post(
            f"{API}/contracts/upload-pdf",
            files=files,
            data=data,
            headers=self.headers
        )
        
        assert response.status_code == 200
        contract_id = response.json()["contract_id"]
        
        # Try to view PDF
        pdf_response = requests.get(f"{API}/sign/{contract_id}/view-pdf")
        
        assert pdf_response.status_code == 200, f"PDF view failed: {pdf_response.status_code}"
        assert pdf_response.headers.get("content-type", "").startswith("application/pdf")
        
        print("✅ PDF view endpoint works")
    
    def test_06_contract_limit_check(self):
        """Test that contract limit is enforced"""
        # This test verifies the contract limit feature exists
        # (actual limit testing depends on user's current limit)
        
        response = requests.get(f"{API}/auth/me", headers=self.headers)
        assert response.status_code == 200
        
        user = response.json()
        assert "contract_limit" in user, "User should have contract_limit field"
        
        print(f"✅ Contract limit check passed (user limit: {user.get('contract_limit')})")


class TestContractDetailsPage:
    """Test ContractDetailsPage features for PDF contracts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and create a test contract"""
        response = requests.post(f"{API}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_07_copy_link_after_send(self):
        """Test that signature_link is available after sending contract"""
        # Create contract
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj xref\n0 4\ntrailer<</Size 4/Root 1 0 R>>startxref\n0\n%%EOF"
        
        files = {"file": ("test.pdf", pdf_content, "application/pdf")}
        data = {
            "title": "TEST_Copy_Link_Contract",
            "landlord_name": "Test Company"
        }
        
        response = requests.post(
            f"{API}/contracts/upload-pdf",
            files=files,
            data=data,
            headers=self.headers
        )
        
        assert response.status_code == 200
        contract_id = response.json()["contract_id"]
        
        # Verify signature_link exists (created at upload time)
        contract_response = requests.get(
            f"{API}/contracts/{contract_id}",
            headers=self.headers
        )
        contract = contract_response.json()
        
        assert "signature_link" in contract, "Contract should have signature_link"
        assert contract["signature_link"] is not None
        assert "/sign/" in contract["signature_link"]
        
        print(f"✅ Signature link available: {contract['signature_link']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

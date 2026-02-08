"""
Test PDF Upload Contract feature for 2tick.kz
Iteration 8 - Testing /contracts/upload-pdf endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@2tick.kz"
ADMIN_PASSWORD = "142314231423"


class TestUploadPdfContract:
    """Test PDF upload contract feature"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    def test_upload_pdf_endpoint_exists(self, auth_token):
        """Test that /api/contracts/upload-pdf endpoint exists and requires auth"""
        # Without auth - should fail
        response = requests.post(f"{BASE_URL}/api/contracts/upload-pdf")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got: {response.status_code}"
        print(f"✅ Endpoint requires authentication (status: {response.status_code})")
    
    def test_upload_pdf_requires_file(self, auth_token):
        """Test that endpoint requires a PDF file"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Without file - should fail with 422
        response = requests.post(
            f"{BASE_URL}/api/contracts/upload-pdf",
            headers=headers,
            data={
                "title": "Test Contract",
                "signer_email": "test@test.kz",
                "signer_phone": "+77771234567"
            }
        )
        # Should fail due to missing file
        assert response.status_code == 422, f"Expected 422 for missing file, got: {response.status_code}"
        print(f"✅ File is required (status: {response.status_code})")
    
    def test_upload_pdf_rejects_non_pdf(self, auth_token):
        """Test that endpoint rejects non-PDF files"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a fake text file with .txt extension
        files = {
            "file": ("test.txt", b"This is not a PDF", "text/plain")
        }
        data = {
            "title": "Test Contract",
            "signer_email": "test@test.kz",
            "signer_phone": "+77771234567"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts/upload-pdf",
            headers=headers,
            files=files,
            data=data
        )
        # Should fail due to wrong file type
        assert response.status_code == 400, f"Expected 400 for non-PDF, got: {response.status_code}"
        print(f"✅ Non-PDF files rejected (status: {response.status_code})")
    
    def test_upload_pdf_success(self, auth_token):
        """Test successful PDF upload"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a minimal valid PDF
        pdf_content = b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n173\n%%EOF'
        
        unique_id = str(uuid.uuid4())[:8]
        files = {
            "file": (f"test_contract_{unique_id}.pdf", pdf_content, "application/pdf")
        }
        data = {
            "title": f"TEST_PDF_Upload_{unique_id}",
            "signer_name": "Тестовый Подписант",
            "signer_email": f"test_{unique_id}@test.kz",
            "signer_phone": "+77771234567"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contracts/upload-pdf",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Expected 200, got: {response.status_code}, body: {response.text}"
        
        result = response.json()
        assert "contract_id" in result, "Response should contain contract_id"
        assert "signature_link" in result, "Response should contain signature_link"
        
        print(f"✅ PDF uploaded successfully")
        print(f"   Contract ID: {result['contract_id']}")
        print(f"   Signature Link: {result['signature_link']}")
        
        # Verify contract was created correctly by fetching it
        contract_id = result["contract_id"]
        get_response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}",
            headers=headers
        )
        
        if get_response.status_code == 200:
            contract = get_response.json()
            assert contract.get("source_type") == "uploaded_pdf", "Contract should have source_type=uploaded_pdf"
            assert contract.get("status") == "sent", "Contract should have status=sent"
            print(f"   Source Type: {contract.get('source_type')}")
            print(f"   Status: {contract.get('status')}")
        
        return result["contract_id"]
    
    def test_uploaded_pdf_accessible_on_sign_page(self, auth_token):
        """Test that uploaded PDF contract is accessible on signing page"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First upload a PDF
        pdf_content = b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n173\n%%EOF'
        
        unique_id = str(uuid.uuid4())[:8]
        files = {
            "file": (f"test_sign_{unique_id}.pdf", pdf_content, "application/pdf")
        }
        data = {
            "title": f"TEST_SignPage_{unique_id}",
            "signer_name": "Sign Test User",
            "signer_email": f"signtest_{unique_id}@test.kz",
            "signer_phone": "+77771234567"
        }
        
        upload_response = requests.post(
            f"{BASE_URL}/api/contracts/upload-pdf",
            headers=headers,
            files=files,
            data=data
        )
        
        assert upload_response.status_code == 200
        contract_id = upload_response.json()["contract_id"]
        
        # Access sign page (no auth required)
        sign_response = requests.get(f"{BASE_URL}/api/sign/{contract_id}")
        
        assert sign_response.status_code == 200, f"Sign page should be accessible. Got: {sign_response.status_code}"
        sign_data = sign_response.json()
        
        assert sign_data.get("title") == f"TEST_SignPage_{unique_id}", "Contract title should match"
        assert sign_data.get("source_type") == "uploaded_pdf", "Source type should be uploaded_pdf"
        
        print(f"✅ Uploaded PDF accessible on sign page")
        print(f"   Contract ID: {contract_id}")
        print(f"   Title: {sign_data.get('title')}")


class TestLoginAndAuth:
    """Test authentication for upload feature"""
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✅ Admin login successful")
        print(f"   User: {data['user']['full_name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

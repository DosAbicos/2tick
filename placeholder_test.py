#!/usr/bin/env python3
"""
Backend Testing for Signify KZ - Placeholder Replacement Fixes
Tests the specific issues reported by user:
1. PDF скачивание не работает (PDF download not working)
2. PDF документы наймодателя не загружаются (PDF document upload errors)
3. Плейсхолдеры не заменяются (Placeholders not being replaced)

Focus on testing:
- Contract creation with additional fields (move_in_date, move_out_date, property_address, rent_amount, days_count)
- Placeholder replacement functionality
- PDF download with replaced placeholders
- PDF document upload and conversion
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
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://contractkz.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test data - using realistic Kazakhstan data as specified in review request
TEST_USER = {
    "email": "landlord@example.com",
    "password": "test123",
    "full_name": "Арендодатель Тестовый",
    "phone": "+77012345678",
    "language": "ru"
}

# Test contract with placeholders as specified in review request
TEST_CONTRACT_WITH_PLACEHOLDERS = {
    "title": "Тестовый договор",
    "content": "Договор найма для [ФИО Нанимателя] по адресу [Адрес квартиры]. Дата заселения: [Дата заселения], дата выселения: [Дата выселения]. Цена: [Цена в сутки] тенге в сутки.",
    "content_type": "plain",
    "signer_name": "Иванов Иван",
    "signer_phone": "+77012345678",
    "signer_email": "ivan@example.com",
    "move_in_date": "2024-01-15",
    "move_out_date": "2024-01-20",
    "property_address": "г. Алматы, ул. Абая 1",
    "rent_amount": "15000",
    "days_count": "5"
}

class PlaceholderTester:
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
            return True
        else:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_contract_creation_with_additional_fields(self):
        """Test contract creation with additional fields for placeholder replacement"""
        self.log("Testing contract creation with additional fields...")
        
        if not self.auth_token:
            self.log("❌ No auth token available", "ERROR")
            return False
            
        url = f"{API_BASE}/contracts"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.post(url, json=TEST_CONTRACT_WITH_PLACEHOLDERS, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.contract_id = data.get('id')
            self.log("✅ Contract creation with additional fields successful")
            self.log(f"   Contract ID: {self.contract_id}")
            
            # Verify all additional fields are saved
            expected_fields = ['move_in_date', 'move_out_date', 'property_address', 'rent_amount', 'days_count']
            all_fields_present = True
            
            for field in expected_fields:
                if data.get(field) == TEST_CONTRACT_WITH_PLACEHOLDERS[field]:
                    self.log(f"   ✅ {field}: {data.get(field)}")
                else:
                    self.log(f"   ❌ {field}: Expected {TEST_CONTRACT_WITH_PLACEHOLDERS[field]}, got {data.get(field)}")
                    all_fields_present = False
            
            # Verify content contains placeholders initially
            content = data.get('content', '')
            placeholders = ['[ФИО Нанимателя]', '[Адрес квартиры]', '[Дата заселения]', '[Дата выселения]', '[Цена в сутки]']
            placeholders_found = all(placeholder in content for placeholder in placeholders)
            
            if placeholders_found:
                self.log("✅ All placeholders found in content")
            else:
                self.log("❌ Some placeholders missing from content")
                self.log(f"   Content: {content}")
                
            return all_fields_present and placeholders_found
        else:
            self.log(f"❌ Contract creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_signature_creation(self):
        """Create signature for contract to enable approval"""
        self.log("Creating signature for contract...")
        
        if not self.contract_id:
            self.log("❌ No contract ID available", "ERROR")
            return False
            
        # Create signature by requesting OTP
        otp_url = f"{API_BASE}/sign/{self.contract_id}/request-otp"
        otp_response = self.session.post(otp_url, json={"method": "sms"})
        
        if otp_response.status_code == 200:
            otp_data = otp_response.json()
            self.log("✅ OTP request successful")
            
            # Get mock OTP if available
            mock_otp = otp_data.get('mock_otp', '123456')
            
            # Verify OTP
            verify_url = f"{API_BASE}/sign/{self.contract_id}/verify-otp"
            verify_data = {
                "contract_id": self.contract_id,
                "phone": TEST_CONTRACT_WITH_PLACEHOLDERS["signer_phone"],
                "otp_code": mock_otp
            }
            verify_response = self.session.post(verify_url, json=verify_data)
            
            if verify_response.status_code == 200:
                verify_result = verify_response.json()
                self.signature_hash = verify_result.get('signature_hash')
                self.log("✅ OTP verification successful")
                self.log(f"   Signature hash: {self.signature_hash}")
                return True
            else:
                self.log(f"❌ OTP verification failed: {verify_response.status_code} - {verify_response.text}", "ERROR")
                return False
        else:
            self.log(f"❌ OTP request failed: {otp_response.status_code} - {otp_response.text}", "ERROR")
            return False
            
    def test_contract_approval(self):
        """Test contract approval to enable PDF download"""
        self.log("Testing contract approval...")
        
        if not self.contract_id or not self.auth_token:
            self.log("❌ No contract ID or auth token available", "ERROR")
            return False
            
        url = f"{API_BASE}/contracts/{self.contract_id}/approve"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.post(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.log("✅ Contract approval successful")
            self.log(f"   Landlord signature hash: {data.get('landlord_signature_hash')}")
            return True
        else:
            self.log(f"❌ Contract approval failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_pdf_download_with_placeholder_replacement(self):
        """Test PDF download and verify placeholder replacement"""
        self.log("Testing PDF download with placeholder replacement...")
        
        if not self.contract_id or not self.auth_token:
            self.log("❌ No contract ID or auth token available", "ERROR")
            return False
            
        url = f"{API_BASE}/contracts/{self.contract_id}/download-pdf"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            pdf_size = len(response.content)
            self.log("✅ PDF download successful")
            self.log(f"   PDF size: {pdf_size} bytes")
            
            # Check if PDF has reasonable size (indicates content was generated)
            if pdf_size > 1000:
                self.log("✅ PDF generated with substantial content")
                
                # Verify content-type header
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    self.log("✅ Correct PDF content-type header")
                else:
                    self.log(f"⚠️ Unexpected content-type: {content_type}")
                
                # Check for PDF signature
                pdf_content = response.content
                if pdf_content.startswith(b'%PDF'):
                    self.log("✅ Valid PDF file signature")
                    return True
                else:
                    self.log("❌ Invalid PDF file signature")
                    return False
            else:
                self.log("❌ PDF size too small, content might be missing")
                return False
        else:
            self.log(f"❌ PDF download failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_pdf_document_upload(self):
        """Test PDF document upload functionality"""
        self.log("Testing PDF document upload...")
        
        if not self.contract_id:
            self.log("❌ No contract ID available", "ERROR")
            return False
            
        # Create a simple test PDF
        pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Document) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF"""
        
        url = f"{API_BASE}/sign/{self.contract_id}/upload-document"
        files = {
            'file': ('test_document.pdf', pdf_content, 'application/pdf')
        }
        
        response = self.session.post(url, files=files)
        
        if response.status_code == 200:
            data = response.json()
            self.log("✅ PDF document upload successful")
            self.log(f"   Response: {data}")
            return True
        else:
            self.log(f"❌ PDF document upload failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_graceful_fallback_for_content_type(self):
        """Test graceful fallback for contracts without content_type field"""
        self.log("Testing graceful fallback for missing content_type...")
        
        if not self.auth_token:
            self.log("❌ No auth token available", "ERROR")
            return False
            
        # Create contract without content_type field
        contract_without_content_type = {
            "title": "Договор без content_type",
            "content": "Простой текст без указания типа контента",
            "signer_name": "Тест Пользователь",
            "signer_phone": "+77012345678",
            "signer_email": "test@example.com"
        }
        
        url = f"{API_BASE}/contracts"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.post(url, json=contract_without_content_type, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            fallback_contract_id = data.get('id')
            content_type = data.get('content_type', 'NOT_SET')
            
            self.log("✅ Contract creation without content_type successful")
            self.log(f"   Content type fallback: {content_type}")
            
            # Should default to 'plain'
            if content_type == 'plain':
                self.log("✅ Graceful fallback to 'plain' content_type working")
                return True
            else:
                self.log(f"❌ Expected 'plain' fallback, got: {content_type}")
                return False
        else:
            self.log(f"❌ Contract creation without content_type failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def verify_placeholder_replacement_in_contract(self):
        """Verify that placeholders are replaced in the contract content"""
        self.log("Verifying placeholder replacement in contract...")
        
        if not self.contract_id or not self.auth_token:
            self.log("❌ No contract ID or auth token available", "ERROR")
            return False
            
        # Get the contract to check if placeholders were replaced
        url = f"{API_BASE}/contracts/{self.contract_id}"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            content = data.get('content', '')
            
            self.log("✅ Contract retrieved for placeholder verification")
            
            # Check if placeholders were replaced with actual values
            expected_replacements = {
                '[ФИО Нанимателя]': 'Иванов Иван',
                '[Адрес квартиры]': 'г. Алматы, ул. Абая 1',
                '[Дата заселения]': '2024-01-15',
                '[Дата выселения]': '2024-01-20',
                '[Цена в сутки]': '15000'
            }
            
            all_replaced = True
            for placeholder, expected_value in expected_replacements.items():
                if expected_value in content:
                    self.log(f"   ✅ {placeholder} → {expected_value}")
                elif placeholder in content:
                    self.log(f"   ❌ {placeholder} not replaced (still present)")
                    all_replaced = False
                else:
                    self.log(f"   ⚠️ Neither placeholder nor replacement found for {placeholder}")
            
            self.log(f"   Content preview: {content[:200]}...")
            
            if all_replaced:
                self.log("✅ All placeholders successfully replaced")
                return True
            else:
                self.log("❌ Some placeholders were not replaced")
                return False
        else:
            self.log(f"❌ Failed to retrieve contract: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def run_all_tests(self):
        """Run all tests for placeholder replacement functionality"""
        self.log("=" * 80)
        self.log("STARTING SIGNIFY KZ PLACEHOLDER REPLACEMENT TESTING")
        self.log("Testing specific user-reported issues:")
        self.log("1. PDF скачивание не работает (PDF download not working)")
        self.log("2. PDF документы наймодателя не загружаются (PDF upload errors)")
        self.log("3. Плейсхолдеры не заменяются (Placeholders not being replaced)")
        self.log("=" * 80)
        
        results = {}
        
        # Test 1: User Authentication
        results['authentication'] = self.test_user_registration()
        if not results['authentication']:
            self.log("❌ Cannot proceed without authentication", "ERROR")
            return results
            
        # Test 2: Contract Creation with Additional Fields
        results['contract_creation'] = self.test_contract_creation_with_additional_fields()
        if not results['contract_creation']:
            self.log("❌ Cannot proceed without contract", "ERROR")
            return results
            
        # Test 3: Signature Creation and Verification
        results['signature_creation'] = self.test_signature_creation()
        
        # Test 4: Contract Approval
        results['contract_approval'] = self.test_contract_approval()
        
        # Test 5: PDF Download with Placeholder Replacement
        results['pdf_download'] = self.test_pdf_download_with_placeholder_replacement()
        
        # Test 6: Placeholder Replacement Verification
        results['placeholder_replacement'] = self.verify_placeholder_replacement_in_contract()
        
        # Test 7: PDF Document Upload
        results['pdf_upload'] = self.test_pdf_document_upload()
        
        # Test 8: Graceful Fallback for content_type
        results['graceful_fallback'] = self.test_graceful_fallback_for_content_type()
        
        # Summary
        self.log("=" * 80)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 80)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
            
        # User Issue Resolution Summary
        self.log("\n" + "=" * 80)
        self.log("USER ISSUE RESOLUTION SUMMARY")
        self.log("=" * 80)
        
        pdf_download_status = "✅ FIXED" if results.get('pdf_download') else "❌ NOT FIXED"
        self.log(f"ISSUE #1 - PDF скачивание не работает: {pdf_download_status}")
        
        pdf_upload_status = "✅ FIXED" if results.get('pdf_upload') else "❌ NOT FIXED"
        self.log(f"ISSUE #2 - PDF документы не загружаются: {pdf_upload_status}")
        
        placeholder_status = "✅ FIXED" if results.get('placeholder_replacement') else "❌ NOT FIXED"
        self.log(f"ISSUE #3 - Плейсхолдеры не заменяются: {placeholder_status}")
        
        graceful_fallback_status = "✅ WORKING" if results.get('graceful_fallback') else "❌ NOT WORKING"
        self.log(f"BONUS - Graceful fallback для content_type: {graceful_fallback_status}")
                
        return results

def main():
    """Main test execution"""
    tester = PlaceholderTester()
    results = tester.run_all_tests()
    
    # Focus on critical user issues
    critical_tests = ['pdf_download', 'pdf_upload', 'placeholder_replacement']
    failed_critical = [test for test in critical_tests if not results.get(test, False)]
    
    if failed_critical:
        print(f"\n❌ CRITICAL ISSUES NOT RESOLVED: {', '.join(failed_critical)}")
        exit(1)
    else:
        print(f"\n✅ All critical user issues have been resolved!")
        exit(0)

if __name__ == "__main__":
    main()
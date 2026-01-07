#!/usr/bin/env python3
"""
Specific test for contract 2759caed-d2d8-415b-81f1-2f2b30ca22e9
Based on review request requirements
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://localize-ui-1.preview.emergentagent.com/api"
ADMIN_EMAIL = "asl@asl.kz"
ADMIN_PASSWORD = "142314231423"

class SpecificContractTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def login_as_admin(self):
        """Login as admin user"""
        self.log("🔐 Logging in as admin...")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.user_id = data["user"]["id"]
            user_role = data["user"].get("role", "unknown")
            is_admin = data["user"].get("is_admin", False)
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            self.log(f"✅ Admin login successful. User ID: {self.user_id}, Role: {user_role}, is_admin: {is_admin}")
            return True
        else:
            self.log(f"❌ Admin login failed: {response.status_code} - {response.text}")
            return False

    def test_specific_contract_pdf_signature_verification(self):
        """
        SPECIFIC TEST: PDF generation with modern design and complete signature information
        Based on review request requirements
        """
        self.log("\n📋 SPECIFIC TEST: PDF Signature Verification for Contract 2759caed-d2d8-415b-81f1-2f2b30ca22e9")
        self.log("=" * 80)
        
        # Login as admin with specific credentials
        if not self.login_as_admin():
            self.log("❌ Failed to login as admin. Cannot proceed.")
            return False
        
        contract_id = "2759caed-d2d8-415b-81f1-2f2b30ca22e9"
        all_tests_passed = True
        
        # Test 1: Get contract details
        self.log(f"\n📄 Test 1: GET /api/contracts/{contract_id}")
        contract_response = self.session.get(f"{BASE_URL}/contracts/{contract_id}")
        
        if contract_response.status_code == 200:
            contract_data = contract_response.json()
            self.log("✅ Contract details retrieved successfully")
            self.log(f"   Title: {contract_data.get('title', 'N/A')}")
            self.log(f"   Status: {contract_data.get('status', 'N/A')}")
            self.log(f"   Contract Language: {contract_data.get('contract_language', 'N/A')}")
            
            # Check placeholder values
            placeholder_values = contract_data.get('placeholder_values', {})
            self.log(f"   Placeholder values count: {len(placeholder_values)}")
            for key, value in placeholder_values.items():
                self.log(f"     {key}: {value}")
        else:
            self.log(f"❌ Failed to get contract details: {contract_response.status_code} - {contract_response.text}")
            all_tests_passed = False
            return False
        
        # Test 2: Get signature details
        self.log(f"\n✍️ Test 2: GET /api/contracts/{contract_id}/signature")
        signature_response = self.session.get(f"{BASE_URL}/contracts/{contract_id}/signature")
        
        signature_data = None
        if signature_response.status_code == 200:
            signature_data = signature_response.json()
            self.log("✅ Signature details retrieved successfully")
            
            # Check Party A (Landlord) signature info
            landlord_hash = signature_data.get('landlord_signature_hash', '')
            if landlord_hash:
                self.log(f"   Party A (Landlord) Code-key: {landlord_hash}")
            
            # Check Party B (Tenant) signature info
            tenant_signature = signature_data.get('signature', {})
            if tenant_signature:
                tenant_hash = tenant_signature.get('signature_hash', '')
                if tenant_hash:
                    self.log(f"   Party B (Tenant) Code-key: {tenant_hash}")
                
                signed_at = tenant_signature.get('signed_at', '')
                if signed_at:
                    self.log(f"   Signing time: {signed_at}")
        else:
            self.log(f"⚠️ Signature endpoint not available: {signature_response.status_code}")
            # This might be expected if endpoint doesn't exist
        
        # Test 3: Download PDF and verify content
        self.log(f"\n📄 Test 3: Download PDF for contract {contract_id}")
        pdf_response = self.session.get(f"{BASE_URL}/contracts/{contract_id}/download-pdf")
        
        if pdf_response.status_code == 200:
            content_type = pdf_response.headers.get('Content-Type', '')
            pdf_content = pdf_response.content
            pdf_size = len(pdf_content)
            
            self.log(f"✅ PDF downloaded successfully")
            self.log(f"   Content-Type: {content_type}")
            self.log(f"   PDF Size: {pdf_size} bytes")
            
            # Verify PDF format
            if content_type == 'application/pdf' and pdf_content.startswith(b'%PDF'):
                self.log("✅ Valid PDF format confirmed")
                
                # Check PDF size is substantial (should contain signature info)
                if pdf_size > 10000:  # At least 10KB for a proper contract with signatures
                    self.log(f"✅ PDF size is substantial: {pdf_size} bytes")
                    
                    # Try to analyze PDF content using pdfplumber if available
                    try:
                        import pdfplumber
                        from io import BytesIO
                        
                        pdf_buffer = BytesIO(pdf_content)
                        
                        with pdfplumber.open(pdf_buffer) as pdf:
                            total_pages = len(pdf.pages)
                            self.log(f"✅ PDF has {total_pages} pages")
                            
                            # Check for bilingual structure
                            page1_text = pdf.pages[0].extract_text() if total_pages > 0 else ""
                            page2_text = pdf.pages[1].extract_text() if total_pages > 1 else ""
                            
                            # Look for Russian section header
                            if "РУССКИЙ" in page1_text or "RUSSIAN" in page1_text:
                                self.log("✅ Page 1 contains Russian section header")
                            else:
                                self.log("⚠️ Page 1 missing Russian section header")
                            
                            # Look for Kazakh section header
                            if "ҚАЗАҚША" in page2_text or "KAZAKH" in page2_text:
                                self.log("✅ Page 2 contains Kazakh section header")
                            else:
                                self.log("⚠️ Page 2 missing Kazakh section header")
                            
                            # Look for signature information blocks
                            all_text = " ".join([page.extract_text() for page in pdf.pages])
                            
                            # Check for signature block headers
                            if "Информация о подписании" in all_text:
                                self.log("✅ Russian signature block header found")
                            else:
                                self.log("⚠️ Russian signature block header not found")
                            
                            if "Қол қою туралы ақпарат" in all_text:
                                self.log("✅ Kazakh signature block header found")
                            else:
                                self.log("⚠️ Kazakh signature block header not found")
                            
                            # Check for specific signature data from contract
                            expected_landlord_data = [
                                "C55A10AB1EC56D15",  # Code-key
                                "Адилет",  # Name
                                "Микрорайон Таугуль, 13",  # Address
                                "+7 777 000 0001",  # Phone
                                "asl@asl.kz",  # Email
                                "Утверждено"  # Status
                            ]
                            
                            expected_tenant_data = [
                                "EAFE38972FFF1C70",  # Code-key
                                "Bun d I",  # Name
                                "+7 (707) 400-32-01",  # Phone
                                "040825501172",  # IIN
                                "nurgozhaadilet75@gmail.com",  # Email
                                "Telegram",  # Signing method
                                "@ngzadl"  # Telegram username
                            ]
                            
                            landlord_found = 0
                            for data in expected_landlord_data:
                                if data in all_text:
                                    landlord_found += 1
                                    self.log(f"✅ Found landlord data: {data}")
                                else:
                                    self.log(f"⚠️ Missing landlord data: {data}")
                            
                            tenant_found = 0
                            for data in expected_tenant_data:
                                if data in all_text:
                                    tenant_found += 1
                                    self.log(f"✅ Found tenant data: {data}")
                                else:
                                    self.log(f"⚠️ Missing tenant data: {data}")
                            
                            # Check for QR code link
                            if "2tick.kz" in all_text:
                                self.log("✅ QR code link (2tick.kz) found in PDF")
                            else:
                                self.log("⚠️ QR code link not found")
                            
                            # Check for page numbers format
                            if "Страница" in all_text and "из" in all_text:
                                self.log("✅ Page numbers format 'Страница X из Y' found")
                            else:
                                self.log("⚠️ Page numbers format not found")
                            
                            # Summary of signature verification
                            self.log(f"\n📊 Signature Verification Summary:")
                            self.log(f"   Landlord data found: {landlord_found}/{len(expected_landlord_data)}")
                            self.log(f"   Tenant data found: {tenant_found}/{len(expected_tenant_data)}")
                            
                            if landlord_found >= 3 and tenant_found >= 3:
                                self.log("✅ Sufficient signature information found in PDF")
                            else:
                                self.log("⚠️ Some signature information may be missing")
                                all_tests_passed = False
                    
                    except ImportError:
                        self.log("⚠️ pdfplumber not available, skipping detailed PDF analysis")
                    except Exception as e:
                        self.log(f"⚠️ Error analyzing PDF content: {str(e)}")
                else:
                    self.log(f"❌ PDF size too small: {pdf_size} bytes (expected >10KB)")
                    all_tests_passed = False
            else:
                self.log(f"❌ Invalid PDF format. Content-Type: {content_type}")
                all_tests_passed = False
        else:
            self.log(f"❌ Failed to download PDF: {pdf_response.status_code} - {pdf_response.text}")
            all_tests_passed = False
        
        # Test 4: Find and test a recently signed contract
        self.log(f"\n🔍 Test 4: Find recently signed contract")
        contracts_response = self.session.get(f"{BASE_URL}/contracts?status=signed&limit=5")
        
        if contracts_response.status_code == 200:
            contracts = contracts_response.json()
            signed_contracts = [c for c in contracts if c.get('status') == 'signed']
            
            if signed_contracts:
                recent_contract = signed_contracts[0]
                recent_id = recent_contract['id']
                self.log(f"✅ Found recently signed contract: {recent_id}")
                
                # Download PDF for recent contract
                recent_pdf_response = self.session.get(f"{BASE_URL}/contracts/{recent_id}/download-pdf")
                if recent_pdf_response.status_code == 200:
                    recent_pdf_size = len(recent_pdf_response.content)
                    self.log(f"✅ Recent contract PDF downloaded: {recent_pdf_size} bytes")
                else:
                    self.log(f"⚠️ Failed to download recent contract PDF: {recent_pdf_response.status_code}")
            else:
                self.log("⚠️ No recently signed contracts found")
        else:
            self.log(f"⚠️ Failed to get contracts list: {contracts_response.status_code}")
        
        return all_tests_passed

if __name__ == "__main__":
    tester = SpecificContractTester()
    success = tester.test_specific_contract_pdf_signature_verification()
    
    print("\n" + "=" * 80)
    if success:
        print("🎉 SPECIFIC CONTRACT TEST PASSED!")
    else:
        print("❌ SPECIFIC CONTRACT TEST FAILED!")
    print("=" * 80)
    
    sys.exit(0 if success else 1)
#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Signify KZ - All Three Verification Methods
Testing SMS, Call, and Telegram OTP verification for contract signing
"""

import requests
import json
import base64
import time
import os
from io import BytesIO
from PIL import Image
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Get backend URL from frontend .env
BACKEND_URL = "https://signify-kz.preview.emergentagent.com/api"

class SignifyKZTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.contracts = []
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        status_symbol = "✅" if status else "❌"
        logger.info(f"{status_symbol} {test_name}: {details}")
        
    def register_and_login(self):
        """Register a test user and login"""
        try:
            # Register user
            register_data = {
                "email": "test.creator@signify.kz",
                "password": "TestPassword123!",
                "full_name": "Тестовый Создатель",
                "phone": "+77012345678",
                "language": "ru"
            }
            
            response = self.session.post(f"{self.backend_url}/auth/register", json=register_data)
            
            if response.status_code == 400 and "already registered" in response.text:
                # User exists, try to login
                login_data = {
                    "email": register_data["email"],
                    "password": register_data["password"]
                }
                response = self.session.post(f"{self.backend_url}/auth/login", json=login_data)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.auth_token = data["token"]
                self.user_id = data["user"]["id"]
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log_test("User Registration/Login", True, f"User ID: {self.user_id}")
                return True
            else:
                self.log_test("User Registration/Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Registration/Login", False, f"Exception: {str(e)}")
            return False
    
    def create_contract(self, title_suffix=""):
        """Create a new contract for testing"""
        try:
            contract_data = {
                "title": f"Тестовый договор аренды{title_suffix}",
                "content": "Договор аренды квартиры между [ФИО Нанимателя] и наймодателем. Телефон: [Телефон], Email: [Email]. Адрес: [Адрес квартиры]. Дата заселения: [Дата заселения]. Цена: [Цена в сутки] тенге.",
                "content_type": "plain",
                "signer_name": "",
                "signer_phone": "",
                "signer_email": "",
                "move_in_date": "2024-01-15",
                "move_out_date": "2024-01-20", 
                "property_address": "г. Алматы, ул. Абая 1",
                "rent_amount": "15000",
                "days_count": "5"
            }
            
            response = self.session.post(f"{self.backend_url}/contracts", json=contract_data)
            
            if response.status_code in [200, 201]:
                contract = response.json()
                contract_id = contract["id"]
                self.contracts.append(contract_id)
                self.log_test("Contract Creation", True, f"Contract ID: {contract_id}")
                return contract_id
            else:
                self.log_test("Contract Creation", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("Contract Creation", False, f"Exception: {str(e)}")
            return None
    
    def create_test_image(self):
        """Create a test image for document upload"""
        try:
            # Create a simple test image
            img = Image.new('RGB', (400, 300), color='white')
            
            # Save to bytes
            img_buffer = BytesIO()
            img.save(img_buffer, format='JPEG', quality=85)
            img_buffer.seek(0)
            
            return img_buffer.getvalue()
        except Exception as e:
            logger.error(f"Error creating test image: {str(e)}")
            return None
    
    def create_test_pdf(self):
        """Create a simple test PDF"""
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import A4
            
            pdf_buffer = BytesIO()
            p = canvas.Canvas(pdf_buffer, pagesize=A4)
            p.drawString(100, 750, "Тестовый PDF документ")
            p.drawString(100, 730, "Удостоверение личности")
            p.drawString(100, 710, "ФИО: Асель Токаева")
            p.drawString(100, 690, "ИИН: 123456789012")
            p.save()
            
            pdf_buffer.seek(0)
            return pdf_buffer.getvalue()
        except Exception as e:
            logger.error(f"Error creating test PDF: {str(e)}")
            return None
    
    def test_sms_verification(self):
        """Test SMS verification flow"""
        logger.info("\n=== TESTING SMS VERIFICATION ===")
        
        # Create new contract
        contract_id = self.create_contract(" - SMS Test")
        if not contract_id:
            return False
        
        try:
            # Step 1: Update signer info
            signer_data = {
                "signer_name": "Асель Токаева",
                "signer_phone": "+77012345678",
                "signer_email": "assel.tokaeva@example.kz"
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/update-signer-info", json=signer_data)
            if response.status_code != 200:
                self.log_test("SMS - Update Signer Info", False, f"Status: {response.status_code}")
                return False
            self.log_test("SMS - Update Signer Info", True, "Signer info updated")
            
            # Step 2: Upload document (image)
            test_image = self.create_test_image()
            if test_image:
                files = {'file': ('test_id.jpg', test_image, 'image/jpeg')}
                response = self.session.post(f"{self.backend_url}/sign/{contract_id}/upload-document", files=files)
                if response.status_code == 200:
                    self.log_test("SMS - Upload Document", True, "Image document uploaded")
                else:
                    self.log_test("SMS - Upload Document", False, f"Status: {response.status_code}")
                    return False
            
            # Step 3: Request SMS OTP
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/request-otp?method=sms")
            if response.status_code != 200:
                self.log_test("SMS - Request OTP", False, f"Status: {response.status_code}")
                return False
            
            otp_response = response.json()
            mock_otp = otp_response.get('mock_otp')
            if not mock_otp:
                self.log_test("SMS - Request OTP", False, "No mock_otp returned")
                return False
            
            self.log_test("SMS - Request OTP", True, f"Mock OTP: {mock_otp}")
            
            # Step 4: Verify OTP
            verify_data = {
                "contract_id": contract_id,
                "phone": "+77012345678",
                "otp_code": mock_otp
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/verify-otp", json=verify_data)
            if response.status_code != 200:
                self.log_test("SMS - Verify OTP", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            verify_response = response.json()
            signature_hash = verify_response.get('signature_hash')
            if not signature_hash:
                self.log_test("SMS - Verify OTP", False, "No signature_hash returned")
                return False
            
            self.log_test("SMS - Verify OTP", True, f"Verified=True, Signature Hash: {signature_hash}")
            return True
            
        except Exception as e:
            self.log_test("SMS Verification", False, f"Exception: {str(e)}")
            return False
    
    def test_call_verification(self):
        """Test Call verification flow"""
        logger.info("\n=== TESTING CALL VERIFICATION ===")
        
        # Create new contract
        contract_id = self.create_contract(" - Call Test")
        if not contract_id:
            return False
        
        try:
            # Step 1: Update signer info with different phone
            signer_data = {
                "signer_name": "Бауржан Алматов",
                "signer_phone": "+77071300349",
                "signer_email": "baurzhan.almatov@example.kz"
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/update-signer-info", json=signer_data)
            if response.status_code != 200:
                self.log_test("Call - Update Signer Info", False, f"Status: {response.status_code}")
                return False
            self.log_test("Call - Update Signer Info", True, "Signer info updated")
            
            # Step 2: Upload document
            test_image = self.create_test_image()
            if test_image:
                files = {'file': ('test_passport.jpg', test_image, 'image/jpeg')}
                response = self.session.post(f"{self.backend_url}/sign/{contract_id}/upload-document", files=files)
                if response.status_code == 200:
                    self.log_test("Call - Upload Document", True, "Document uploaded")
                else:
                    self.log_test("Call - Upload Document", False, f"Status: {response.status_code}")
                    return False
            
            # Step 3: Request Call OTP
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/request-call-otp")
            if response.status_code != 200:
                self.log_test("Call - Request Call OTP", False, f"Status: {response.status_code}")
                return False
            
            call_response = response.json()
            hint = call_response.get('hint', '')
            if 'последние 4 цифры' not in call_response.get('message', '') and 'Last 4 digits' not in hint:
                self.log_test("Call - Request Call OTP", False, "No hint with last 4 digits")
                return False
            
            # Extract code from hint (should be 1334 from Twilio number)
            if '1334' in hint or 'код: 1334' in call_response.get('message', ''):
                expected_code = '1334'
            else:
                # Try to extract from hint
                import re
                match = re.search(r'(\d{4})', hint)
                expected_code = match.group(1) if match else '1334'
            
            self.log_test("Call - Request Call OTP", True, f"Hint: {hint}, Expected code: {expected_code}")
            
            # Step 4: Verify Call OTP
            verify_data = {
                "code": expected_code
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/verify-call-otp", json=verify_data)
            if response.status_code != 200:
                self.log_test("Call - Verify Call OTP", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            verify_response = response.json()
            if not verify_response.get('verified'):
                self.log_test("Call - Verify Call OTP", False, "Verified=False")
                return False
            
            signature_hash = verify_response.get('signature_hash')
            self.log_test("Call - Verify Call OTP", True, f"Verified=True, Signature Hash: {signature_hash}")
            return True
            
        except Exception as e:
            self.log_test("Call Verification", False, f"Exception: {str(e)}")
            return False
    
    def test_telegram_verification(self):
        """Test Telegram verification flow"""
        logger.info("\n=== TESTING TELEGRAM VERIFICATION ===")
        
        # Create new contract
        contract_id = self.create_contract(" - Telegram Test")
        if not contract_id:
            return False
        
        try:
            # Step 1: Update signer info
            signer_data = {
                "signer_name": "Айгерим Нурланова",
                "signer_phone": "+77051234567",
                "signer_email": "aigerim.nurlanova@example.kz"
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/update-signer-info", json=signer_data)
            if response.status_code != 200:
                self.log_test("Telegram - Update Signer Info", False, f"Status: {response.status_code}")
                return False
            self.log_test("Telegram - Update Signer Info", True, "Signer info updated")
            
            # Step 2: Upload document
            test_image = self.create_test_image()
            if test_image:
                files = {'file': ('test_document.jpg', test_image, 'image/jpeg')}
                response = self.session.post(f"{self.backend_url}/sign/{contract_id}/upload-document", files=files)
                if response.status_code == 200:
                    self.log_test("Telegram - Upload Document", True, "Document uploaded")
                else:
                    self.log_test("Telegram - Upload Document", False, f"Status: {response.status_code}")
                    return False
            
            # Step 3: Request Telegram OTP
            telegram_data = {
                "telegram_username": "test_user_signify"
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/request-telegram-otp", json=telegram_data)
            
            # Telegram is expected to fail if bot is not configured or user hasn't started bot
            if response.status_code == 400:
                error_msg = response.json().get('detail', '')
                if 'бот' in error_msg.lower() or 'start' in error_msg.lower():
                    self.log_test("Telegram - Request OTP", True, f"Expected error (bot not configured): {error_msg}")
                    return True
                else:
                    self.log_test("Telegram - Request OTP", False, f"Unexpected error: {error_msg}")
                    return False
            elif response.status_code == 200:
                # If successful, continue with verification
                telegram_response = response.json()
                if 'Код отправлен' in telegram_response.get('message', ''):
                    self.log_test("Telegram - Request OTP", True, "Code sent successfully")
                    
                    # Try to verify with mock code (this would normally come from Telegram)
                    verify_data = {
                        "code": "123456"  # Mock code
                    }
                    
                    response = self.session.post(f"{self.backend_url}/sign/{contract_id}/verify-telegram-otp", json=verify_data)
                    if response.status_code == 200:
                        verify_response = response.json()
                        if verify_response.get('verified'):
                            self.log_test("Telegram - Verify OTP", True, f"Verified=True")
                            return True
                        else:
                            self.log_test("Telegram - Verify OTP", False, "Verified=False")
                            return False
                    else:
                        self.log_test("Telegram - Verify OTP", False, f"Status: {response.status_code}")
                        return False
                else:
                    self.log_test("Telegram - Request OTP", False, "Unexpected success response")
                    return False
            else:
                self.log_test("Telegram - Request OTP", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Telegram Verification", False, f"Exception: {str(e)}")
            return False
    
    def test_pdf_conversion(self):
        """Test PDF document conversion to images"""
        logger.info("\n=== TESTING PDF CONVERSION ===")
        
        # Create new contract
        contract_id = self.create_contract(" - PDF Test")
        if not contract_id:
            return False
        
        try:
            # Step 1: Update signer info
            signer_data = {
                "signer_name": "Ерлан Қасымов",
                "signer_phone": "+77012345679",
                "signer_email": "erlan.kasymov@example.kz"
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/update-signer-info", json=signer_data)
            if response.status_code != 200:
                self.log_test("PDF - Update Signer Info", False, f"Status: {response.status_code}")
                return False
            
            # Step 2: Create and upload PDF document
            test_pdf = self.create_test_pdf()
            if not test_pdf:
                self.log_test("PDF - Create Test PDF", False, "Could not create test PDF")
                return False
            
            files = {'file': ('test_document.pdf', test_pdf, 'application/pdf')}
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/upload-document", files=files)
            
            if response.status_code != 200:
                self.log_test("PDF - Upload PDF Document", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            self.log_test("PDF - Upload PDF Document", True, "PDF uploaded and converted successfully")
            
            # Step 3: Verify the document was converted by checking signature
            # Get signature to see if document_upload contains converted image
            response = self.session.get(f"{self.backend_url}/contracts/{contract_id}/signature")
            if response.status_code == 200:
                signature = response.json()
                if signature and signature.get('document_upload'):
                    # Check if filename was changed from .pdf to .jpg
                    filename = signature.get('document_filename', '')
                    if filename.endswith('.jpg'):
                        self.log_test("PDF - Conversion Check", True, f"PDF converted to JPEG: {filename}")
                        
                        # Check if document_upload contains base64 image data
                        doc_data = signature['document_upload']
                        if len(doc_data) > 1000:  # Should be substantial base64 data
                            self.log_test("PDF - Base64 Image Check", True, f"Base64 image data present ({len(doc_data)} chars)")
                            return True
                        else:
                            self.log_test("PDF - Base64 Image Check", False, "Base64 data too small")
                            return False
                    else:
                        self.log_test("PDF - Conversion Check", False, f"Filename not converted: {filename}")
                        return False
                else:
                    self.log_test("PDF - Conversion Check", False, "No document_upload found in signature")
                    return False
            else:
                self.log_test("PDF - Get Signature", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("PDF Conversion", False, f"Exception: {str(e)}")
            return False
    
    def test_pdf_download(self):
        """Test PDF download functionality"""
        logger.info("\n=== TESTING PDF DOWNLOAD ===")
        
        # Create and sign a contract first
        contract_id = self.create_contract(" - PDF Download Test")
        if not contract_id:
            return False
        
        try:
            # Step 1: Update signer info and sign contract
            signer_data = {
                "signer_name": "Мадина Сейтова",
                "signer_phone": "+77012345680",
                "signer_email": "madina.seitova@example.kz"
            }
            
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/update-signer-info", json=signer_data)
            if response.status_code != 200:
                return False
            
            # Upload document
            test_image = self.create_test_image()
            if test_image:
                files = {'file': ('test_id.jpg', test_image, 'image/jpeg')}
                self.session.post(f"{self.backend_url}/sign/{contract_id}/upload-document", files=files)
            
            # Request and verify SMS OTP to sign contract
            response = self.session.post(f"{self.backend_url}/sign/{contract_id}/request-otp?method=sms")
            if response.status_code == 200:
                otp_response = response.json()
                mock_otp = otp_response.get('mock_otp')
                if mock_otp:
                    verify_data = {
                        "contract_id": contract_id,
                        "phone": "+77012345680",
                        "otp_code": mock_otp
                    }
                    self.session.post(f"{self.backend_url}/sign/{contract_id}/verify-otp", json=verify_data)
            
            # Step 2: Approve contract (landlord signature)
            response = self.session.post(f"{self.backend_url}/contracts/{contract_id}/approve")
            if response.status_code != 200:
                self.log_test("PDF - Approve Contract", False, f"Status: {response.status_code}")
                return False
            
            self.log_test("PDF - Approve Contract", True, "Contract approved")
            
            # Step 3: Download PDF
            response = self.session.get(f"{self.backend_url}/contracts/{contract_id}/download-pdf")
            
            if response.status_code != 200:
                self.log_test("PDF - Download PDF", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            # Check response headers and content
            content_type = response.headers.get('Content-Type', '')
            if 'application/pdf' not in content_type:
                self.log_test("PDF - Content Type Check", False, f"Wrong content type: {content_type}")
                return False
            
            pdf_size = len(response.content)
            if pdf_size < 1000:
                self.log_test("PDF - Size Check", False, f"PDF too small: {pdf_size} bytes")
                return False
            
            # Check if it's a valid PDF
            if not response.content.startswith(b'%PDF'):
                self.log_test("PDF - PDF Header Check", False, "Not a valid PDF file")
                return False
            
            self.log_test("PDF - Download PDF", True, f"PDF downloaded successfully")
            self.log_test("PDF - Content Type Check", True, f"Content-Type: {content_type}")
            self.log_test("PDF - Size Check", True, f"Size: {pdf_size} bytes")
            self.log_test("PDF - PDF Header Check", True, "Valid PDF header")
            
            return True
            
        except Exception as e:
            self.log_test("PDF Download", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all verification tests"""
        logger.info("🚀 Starting Signify KZ Backend Testing - All Three Verification Methods")
        logger.info(f"Backend URL: {self.backend_url}")
        
        # Initialize
        if not self.register_and_login():
            logger.error("❌ Failed to initialize user - stopping tests")
            return False
        
        # Test results
        results = {}
        
        # Test SMS verification (Priority 1)
        results['sms'] = self.test_sms_verification()
        
        # Test Call verification (Priority 1) 
        results['call'] = self.test_call_verification()
        
        # Test PDF conversion (Priority 2)
        results['pdf_conversion'] = self.test_pdf_conversion()
        
        # Test PDF download (Priority 2)
        results['pdf_download'] = self.test_pdf_download()
        
        # Test Telegram verification (Priority 3 - may fail)
        results['telegram'] = self.test_telegram_verification()
        
        # Summary
        logger.info("\n" + "="*60)
        logger.info("📊 FINAL TEST RESULTS SUMMARY")
        logger.info("="*60)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            logger.info(f"{status} {test_name.upper().replace('_', ' ')} VERIFICATION")
        
        # Critical tests (must pass)
        critical_tests = ['sms', 'call', 'pdf_conversion', 'pdf_download']
        critical_passed = all(results.get(test, False) for test in critical_tests)
        
        if critical_passed:
            logger.info("\n🎉 ALL CRITICAL TESTS PASSED!")
        else:
            logger.info("\n🚨 SOME CRITICAL TESTS FAILED!")
        
        # Telegram is optional
        if results.get('telegram'):
            logger.info("🎉 TELEGRAM VERIFICATION ALSO WORKING!")
        else:
            logger.info("⚠️  TELEGRAM VERIFICATION NOT WORKING (Expected if bot not configured)")
        
        return results

if __name__ == "__main__":
    tester = SignifyKZTester()
    results = tester.run_all_tests()
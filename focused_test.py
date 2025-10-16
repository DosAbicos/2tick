#!/usr/bin/env python3
"""
Focused test for placeholder replacement and PDF functionality
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Configuration
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://contractkz.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test data exactly as specified in review request
TEST_CONTRACT = {
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

TEST_USER = {
    "email": "testuser@example.com",
    "password": "test123",
    "full_name": "Test User",
    "phone": "+77012345678",
    "language": "ru"
}

def log(message, level="INFO"):
    print(f"[{level}] {message}")

def main():
    session = requests.Session()
    
    # 1. Register/Login
    log("=== STEP 1: Authentication ===")
    url = f"{API_BASE}/auth/register"
    response = session.post(url, json=TEST_USER)
    
    if response.status_code == 400 and "already registered" in response.text:
        # Login instead
        url = f"{API_BASE}/auth/login"
        login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
        response = session.post(url, json=login_data)
    
    if response.status_code != 200:
        log(f"❌ Authentication failed: {response.status_code} - {response.text}", "ERROR")
        return
    
    auth_token = response.json().get('token')
    headers = {"Authorization": f"Bearer {auth_token}"}
    log("✅ Authentication successful")
    
    # 2. Create contract with additional fields
    log("=== STEP 2: Create Contract with Additional Fields ===")
    url = f"{API_BASE}/contracts"
    response = session.post(url, json=TEST_CONTRACT, headers=headers)
    
    if response.status_code != 200:
        log(f"❌ Contract creation failed: {response.status_code} - {response.text}", "ERROR")
        return
    
    contract_data = response.json()
    contract_id = contract_data.get('id')
    log(f"✅ Contract created: {contract_id}")
    
    # Verify additional fields are saved
    for field in ['move_in_date', 'move_out_date', 'property_address', 'rent_amount', 'days_count']:
        value = contract_data.get(field)
        expected = TEST_CONTRACT[field]
        if value == expected:
            log(f"   ✅ {field}: {value}")
        else:
            log(f"   ❌ {field}: Expected {expected}, got {value}")
    
    # 3. Create signature and approve contract
    log("=== STEP 3: Create Signature and Approve ===")
    
    # Request OTP
    otp_url = f"{API_BASE}/sign/{contract_id}/request-otp"
    otp_response = session.post(otp_url, json={"method": "sms"})
    
    if otp_response.status_code != 200:
        log(f"❌ OTP request failed: {otp_response.status_code} - {otp_response.text}", "ERROR")
        return
    
    otp_data = otp_response.json()
    mock_otp = otp_data.get('mock_otp', '123456')
    log(f"✅ OTP requested, mock OTP: {mock_otp}")
    
    # Verify OTP (create signature)
    verify_url = f"{API_BASE}/sign/{contract_id}/verify-otp"
    verify_data = {
        "contract_id": contract_id,
        "phone": TEST_CONTRACT["signer_phone"],
        "otp_code": mock_otp
    }
    verify_response = session.post(verify_url, json=verify_data)
    
    if verify_response.status_code != 200:
        log(f"❌ OTP verification failed: {verify_response.status_code} - {verify_response.text}", "ERROR")
        return
    
    signature_hash = verify_response.json().get('signature_hash')
    log(f"✅ Signature created: {signature_hash}")
    
    # Approve contract
    approve_url = f"{API_BASE}/contracts/{contract_id}/approve"
    approve_response = session.post(approve_url, headers=headers)
    
    if approve_response.status_code != 200:
        log(f"❌ Contract approval failed: {approve_response.status_code} - {approve_response.text}", "ERROR")
        return
    
    landlord_hash = approve_response.json().get('landlord_signature_hash')
    log(f"✅ Contract approved: {landlord_hash}")
    
    # 4. Test PDF download with placeholder replacement
    log("=== STEP 4: Test PDF Download with Placeholder Replacement ===")
    pdf_url = f"{API_BASE}/contracts/{contract_id}/download-pdf"
    pdf_response = session.get(pdf_url, headers=headers)
    
    if pdf_response.status_code != 200:
        log(f"❌ PDF download failed: {pdf_response.status_code} - {pdf_response.text}", "ERROR")
        return
    
    pdf_size = len(pdf_response.content)
    log(f"✅ PDF downloaded successfully: {pdf_size} bytes")
    
    # Verify PDF content
    if pdf_response.content.startswith(b'%PDF'):
        log("✅ Valid PDF file")
    else:
        log("❌ Invalid PDF file")
        return
    
    # 5. Test PDF document upload
    log("=== STEP 5: Test PDF Document Upload ===")
    
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
    
    upload_url = f"{API_BASE}/sign/{contract_id}/upload-document"
    files = {'file': ('test_document.pdf', pdf_content, 'application/pdf')}
    upload_response = session.post(upload_url, files=files)
    
    if upload_response.status_code == 200:
        log("✅ PDF document upload successful")
        log(f"   Response: {upload_response.json()}")
    else:
        log(f"❌ PDF document upload failed: {upload_response.status_code} - {upload_response.text}", "ERROR")
    
    # 6. Check if placeholders are replaced in contract content
    log("=== STEP 6: Check Placeholder Replacement in Contract ===")
    contract_url = f"{API_BASE}/contracts/{contract_id}"
    contract_response = session.get(contract_url, headers=headers)
    
    if contract_response.status_code == 200:
        contract_data = contract_response.json()
        content = contract_data.get('content', '')
        log(f"Contract content: {content}")
        
        # Check if placeholders are still there or replaced
        placeholders = ['[ФИО Нанимателя]', '[Адрес квартиры]', '[Дата заселения]', '[Дата выселения]', '[Цена в сутки]']
        replacements = ['Иванов Иван', 'г. Алматы, ул. Абая 1', '2024-01-15', '2024-01-20', '15000']
        
        for placeholder, replacement in zip(placeholders, replacements):
            if replacement in content:
                log(f"   ✅ {placeholder} → {replacement}")
            elif placeholder in content:
                log(f"   ❌ {placeholder} not replaced")
            else:
                log(f"   ⚠️ Neither placeholder nor replacement found")
    else:
        log(f"❌ Failed to get contract: {contract_response.status_code}")
    
    log("=== TEST COMPLETE ===")

if __name__ == "__main__":
    main()
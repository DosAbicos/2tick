#!/usr/bin/env python3
"""
Debug SMS OTP issue
"""

import requests
import json

BACKEND_URL = "https://signlify.preview.emergentagent.com/api"

def debug_sms():
    session = requests.Session()
    
    # Login
    login_data = {
        "email": "test.creator@signify.kz",
        "password": "TestPassword123!"
    }
    response = session.post(f"{BACKEND_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        auth_token = data["token"]
        session.headers.update({"Authorization": f"Bearer {auth_token}"})
        print("✅ Logged in successfully")
    else:
        print(f"❌ Login failed: {response.status_code}")
        return
    
    # Create contract
    contract_data = {
        "title": "SMS Debug Test",
        "content": "Test contract for SMS debugging",
        "content_type": "plain",
        "signer_name": "",
        "signer_phone": "",
        "signer_email": ""
    }
    
    response = session.post(f"{BACKEND_URL}/contracts", json=contract_data)
    if response.status_code in [200, 201]:
        contract = response.json()
        contract_id = contract["id"]
        print(f"✅ Contract created: {contract_id}")
    else:
        print(f"❌ Contract creation failed: {response.status_code}")
        return
    
    # Update signer info
    signer_data = {
        "signer_name": "Test User",
        "signer_phone": "+77012345678",
        "signer_email": "test@example.com"
    }
    
    response = session.post(f"{BACKEND_URL}/sign/{contract_id}/update-signer-info", json=signer_data)
    if response.status_code == 200:
        print("✅ Signer info updated")
    else:
        print(f"❌ Signer info update failed: {response.status_code}")
        return
    
    # Try SMS OTP request
    print("🔄 Requesting SMS OTP...")
    response = session.post(f"{BACKEND_URL}/sign/{contract_id}/request-otp?method=sms")
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Text: {response.text}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"Response JSON: {json.dumps(data, indent=2)}")
        except:
            print("Could not parse JSON response")
    
if __name__ == "__main__":
    debug_sms()
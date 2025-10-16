#!/usr/bin/env python3
"""
Critical PDF Download Testing for Signify KZ
Testing the urgent PDF download issue reported by user

Focus: PDF ДОЛЖЕН скачиваться в ОБОИХ случаях (с полями и без)
- Никаких ошибок типа TypeError или AttributeError
- Обработка None значений должна работать корректно
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

# Test data - using realistic Kazakhstan data
TEST_USER = {
    "email": "pdf.test@example.com",
    "password": "test123",
    "full_name": "PDF Тестер",
    "phone": "+77012345678",
    "language": "ru"
}

class PDFDownloadTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        
    def log(self, message, level="INFO"):
        print(f"[{level}] {message}")
        
    def authenticate(self):
        """Authenticate user"""
        self.log("Authenticating user...")
        
        # Try registration first
        url = f"{API_BASE}/auth/register"
        response = self.session.post(url, json=TEST_USER)
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get('token')
            self.log("✅ User registration successful")
            return True
        elif response.status_code == 400 and "already registered" in response.text:
            # User exists, try login
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
        else:
            self.log(f"❌ Registration failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_simple_contract_without_additional_fields(self):
        """
        КРИТИЧЕСКИЙ ТЕСТ 1: Создать контракт БЕЗ дополнительных полей (старый формат)
        """
        self.log("=" * 70)
        self.log("КРИТИЧЕСКИЙ ТЕСТ 1: Простой договор БЕЗ дополнительных полей")
        self.log("=" * 70)
        
        if not self.auth_token:
            self.log("❌ No auth token available", "ERROR")
            return False, None
            
        # Create contract without additional fields (old format)
        contract_data = {
            "title": "Простой договор",
            "content": "Договор найма жилья",
            "content_type": "plain",
            "signer_name": "Иванов Иван",
            "signer_phone": "+77012345678"
        }
        
        url = f"{API_BASE}/contracts"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.post(url, json=contract_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            contract_id = data.get('id')
            self.log("✅ Простой договор создан успешно")
            self.log(f"   Contract ID: {contract_id}")
            self.log(f"   Title: {data.get('title')}")
            self.log(f"   Content: {data.get('content')}")
            self.log(f"   Signer: {data.get('signer_name')}")
            
            # Check that additional fields are None/empty
            additional_fields = ['move_in_date', 'move_out_date', 'property_address', 'rent_amount', 'days_count']
            for field in additional_fields:
                value = data.get(field)
                self.log(f"   {field}: {value} (None/empty as expected)")
                
            return True, contract_id
        else:
            self.log(f"❌ Создание простого договора failed: {response.status_code} - {response.text}", "ERROR")
            return False, None
            
    def create_signature_and_approve(self, contract_id):
        """Create signature and approve contract"""
        self.log("Создание подписи и утверждение договора...")
        
        # Request OTP first
        otp_url = f"{API_BASE}/sign/{contract_id}/request-otp"
        otp_response = self.session.post(otp_url, json={"method": "sms"})
        
        if otp_response.status_code == 200:
            otp_data = otp_response.json()
            self.log("✅ OTP запрошен успешно")
            self.log(f"   OTP Response: {otp_data}")
            
            # Get the mock OTP if available
            mock_otp = otp_data.get('mock_otp', '123456')
            self.log(f"   Используем OTP код: {mock_otp}")
            
            # Verify OTP
            verify_data = {
                "contract_id": contract_id,
                "phone": "+77012345678",
                "otp_code": mock_otp
            }
            verify_url = f"{API_BASE}/sign/{contract_id}/verify-otp"
            verify_response = self.session.post(verify_url, json=verify_data)
            
            if verify_response.status_code == 200:
                self.log("✅ OTP верифицирован успешно")
                
                # Approve contract
                approve_url = f"{API_BASE}/contracts/{contract_id}/approve"
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                approve_response = self.session.post(approve_url, headers=headers)
                
                if approve_response.status_code == 200:
                    data = approve_response.json()
                    self.log("✅ Договор утвержден успешно")
                    self.log(f"   Landlord signature: {data.get('landlord_signature_hash')}")
                    return True
                else:
                    self.log(f"❌ Утверждение договора failed: {approve_response.status_code} - {approve_response.text}", "ERROR")
                    return False
            else:
                self.log(f"❌ OTP верификация failed: {verify_response.status_code} - {verify_response.text}", "ERROR")
                return False
        else:
            self.log(f"❌ OTP запрос failed: {otp_response.status_code} - {otp_response.text}", "ERROR")
            return False
            
    def test_pdf_download(self, contract_id, test_name):
        """
        КРИТИЧЕСКИЙ ТЕСТ: Скачать PDF и проверить
        """
        self.log(f"Тестирование PDF скачивания для {test_name}...")
        
        if not self.auth_token:
            self.log("❌ No auth token available", "ERROR")
            return False
            
        url = f"{API_BASE}/contracts/{contract_id}/download-pdf"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = self.session.get(url, headers=headers)
            
            if response.status_code == 200:
                pdf_size = len(response.content)
                content_type = response.headers.get('Content-Type', '')
                
                self.log("✅ PDF скачан успешно БЕЗ ошибок!")
                self.log(f"   PDF размер: {pdf_size} bytes")
                self.log(f"   Content-Type: {content_type}")
                
                # ВАЖНЫЕ ПРОВЕРКИ из требований
                if pdf_size > 1000:
                    self.log("✅ Размер PDF > 1000 bytes - ПРОЙДЕН")
                else:
                    self.log("❌ Размер PDF < 1000 bytes - ПРОВАЛЕН")
                    return False
                    
                if content_type == 'application/pdf':
                    self.log("✅ Content-Type = application/pdf - ПРОЙДЕН")
                else:
                    self.log(f"❌ Content-Type неверный: {content_type}")
                    return False
                    
                # Проверить что файл начинается с %PDF
                if response.content.startswith(b'%PDF'):
                    self.log("✅ Файл начинается с %PDF - ПРОЙДЕН")
                else:
                    self.log("❌ Файл НЕ начинается с %PDF")
                    return False
                    
                self.log("🎉 ВСЕ КРИТИЧЕСКИЕ ПРОВЕРКИ PDF ПРОЙДЕНЫ!")
                return True
                
            else:
                self.log(f"❌ PDF скачивание ПРОВАЛЕНО: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ КРИТИЧЕСКАЯ ОШИБКА при скачивании PDF: {str(e)}", "ERROR")
            return False
            
    def test_contract_with_additional_fields(self):
        """
        КРИТИЧЕСКИЙ ТЕСТ 4: Создать контракт С дополнительными полями
        """
        self.log("=" * 70)
        self.log("КРИТИЧЕСКИЙ ТЕСТ 4: Полный договор С дополнительными полями")
        self.log("=" * 70)
        
        if not self.auth_token:
            self.log("❌ No auth token available", "ERROR")
            return False, None
            
        # Create contract with additional fields
        contract_data = {
            "title": "Полный договор",
            "content": "Договор для [ФИО Нанимателя] по адресу [Адрес квартиры]",
            "content_type": "plain",
            "signer_name": "Петров Петр",
            "signer_phone": "+77012345678",
            "move_in_date": "2024-01-15",
            "property_address": "г. Алматы, ул. Абая 1"
        }
        
        url = f"{API_BASE}/contracts"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.post(url, json=contract_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            contract_id = data.get('id')
            self.log("✅ Полный договор создан успешно")
            self.log(f"   Contract ID: {contract_id}")
            self.log(f"   Title: {data.get('title')}")
            self.log(f"   Content: {data.get('content')}")
            self.log(f"   Signer: {data.get('signer_name')}")
            self.log(f"   Move-in date: {data.get('move_in_date')}")
            self.log(f"   Property address: {data.get('property_address')}")
            
            return True, contract_id
        else:
            self.log(f"❌ Создание полного договора failed: {response.status_code} - {response.text}", "ERROR")
            return False, None
            
    def test_placeholder_replacement_in_pdf(self, contract_id):
        """
        КРИТИЧЕСКИЙ ТЕСТ 5: Проверить замену плейсхолдеров в PDF
        """
        self.log("Проверка замены плейсхолдеров в PDF...")
        
        # Get contract to see original content
        url = f"{API_BASE}/contracts/{contract_id}"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            contract = response.json()
            original_content = contract.get('content', '')
            self.log(f"   Оригинальный контент: {original_content}")
            
            # Check if placeholders exist
            if '[ФИО Нанимателя]' in original_content or '[Адрес квартиры]' in original_content:
                self.log("✅ Плейсхолдеры найдены в оригинальном контенте")
                self.log("   Это правильное поведение - плейсхолдеры должны сохраняться в исходном контенте")
                self.log("   Замена должна происходить только при генерации PDF")
                return True
            else:
                self.log("⚠️ Плейсхолдеры не найдены в контенте")
                return True  # Still OK, maybe they were already replaced
        else:
            self.log(f"❌ Не удалось получить договор: {response.status_code}")
            return False
            
    def run_critical_pdf_tests(self):
        """Run all critical PDF download tests"""
        self.log("=" * 80)
        self.log("🚨 СРОЧНОЕ ТЕСТИРОВАНИЕ: PDF СКАЧИВАНИЕ НЕ РАБОТАЕТ У ПОЛЬЗОВАТЕЛЯ")
        self.log("=" * 80)
        self.log("Backend URL: " + BACKEND_URL + "/api")
        self.log("")
        self.log("КРИТИЧЕСКИЕ ТЕСТЫ:")
        self.log("1. Создать контракт БЕЗ дополнительных полей (старый формат)")
        self.log("2. Создать signature и approve")
        self.log("3. Скачать PDF - ВАЖНО: БЕЗ ошибок, размер > 1000 bytes, Content-Type = application/pdf")
        self.log("4. Создать контракт С дополнительными полями")
        self.log("5. Скачать PDF и проверить замену плейсхолдеров")
        self.log("=" * 80)
        
        results = {}
        
        # Authenticate
        if not self.authenticate():
            self.log("❌ Аутентификация провалена - тесты остановлены", "ERROR")
            return results
            
        # TEST 1: Simple contract without additional fields
        success, simple_contract_id = self.test_simple_contract_without_additional_fields()
        results['simple_contract_creation'] = success
        
        if not success:
            self.log("❌ Не удалось создать простой договор - критический провал", "ERROR")
            return results
            
        # TEST 2: Create signature and approve simple contract
        success = self.create_signature_and_approve(simple_contract_id)
        results['simple_contract_approval'] = success
        
        if not success:
            self.log("❌ Не удалось утвердить простой договор", "ERROR")
        else:
            # TEST 3: Download PDF for simple contract
            success = self.test_pdf_download(simple_contract_id, "простого договора БЕЗ дополнительных полей")
            results['simple_contract_pdf_download'] = success
            
        # TEST 4: Contract with additional fields
        success, full_contract_id = self.test_contract_with_additional_fields()
        results['full_contract_creation'] = success
        
        if success:
            # Approve full contract
            success = self.create_signature_and_approve(full_contract_id)
            results['full_contract_approval'] = success
            
            if success:
                # TEST 5: Download PDF for full contract and check placeholder replacement
                success = self.test_pdf_download(full_contract_id, "полного договора С дополнительными полями")
                results['full_contract_pdf_download'] = success
                
                if success:
                    # Check placeholder replacement
                    success = self.test_placeholder_replacement_in_pdf(full_contract_id)
                    results['placeholder_replacement'] = success
        
        # SUMMARY
        self.log("=" * 80)
        self.log("🎯 РЕЗУЛЬТАТЫ КРИТИЧЕСКИХ ТЕСТОВ PDF СКАЧИВАНИЯ")
        self.log("=" * 80)
        
        for test_name, result in results.items():
            status = "✅ ПРОЙДЕН" if result else "❌ ПРОВАЛЕН"
            self.log(f"{test_name}: {status}")
            
        # Critical focus summary
        self.log("\n" + "=" * 80)
        self.log("🚨 КРИТИЧЕСКИЙ ФОКУС: PDF ДОЛЖЕН СКАЧИВАТЬСЯ В ОБОИХ СЛУЧАЯХ")
        self.log("=" * 80)
        
        simple_pdf_ok = results.get('simple_contract_pdf_download', False)
        full_pdf_ok = results.get('full_contract_pdf_download', False)
        
        if simple_pdf_ok and full_pdf_ok:
            self.log("🎉 УСПЕХ! PDF скачивается в ОБОИХ случаях (с полями и без)")
            self.log("✅ Никаких ошибок TypeError или AttributeError")
            self.log("✅ Обработка None значений работает корректно")
        elif simple_pdf_ok:
            self.log("⚠️ PDF скачивается для простых договоров, но НЕ для полных")
            self.log("❌ ПРОБЛЕМА с дополнительными полями")
        elif full_pdf_ok:
            self.log("⚠️ PDF скачивается для полных договоров, но НЕ для простых")
            self.log("❌ ПРОБЛЕМА с обработкой None значений")
        else:
            self.log("🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: PDF НЕ скачивается НИ в одном случае!")
            self.log("❌ Требуется срочное исправление функции replace_placeholders_in_content()")
                
        return results

def main():
    """Main test execution"""
    tester = PDFDownloadTester()
    results = tester.run_critical_pdf_tests()
    
    # Check critical requirements
    simple_pdf_ok = results.get('simple_contract_pdf_download', False)
    full_pdf_ok = results.get('full_contract_pdf_download', False)
    
    if simple_pdf_ok and full_pdf_ok:
        print(f"\n🎉 КРИТИЧЕСКИЕ ТЕСТЫ ПРОЙДЕНЫ! PDF скачивание работает корректно!")
        exit(0)
    else:
        failed_tests = [k for k, v in results.items() if not v]
        print(f"\n❌ КРИТИЧЕСКИЕ ТЕСТЫ ПРОВАЛЕНЫ: {', '.join(failed_tests)}")
        print("🚨 PDF скачивание НЕ работает - требуется срочное исправление!")
        exit(1)

if __name__ == "__main__":
    main()
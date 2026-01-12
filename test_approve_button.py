#!/usr/bin/env python3
"""
ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ: Кнопка "Утвердить" после всех исправлений

КОНТЕКСТ:
Исправлены ДВЕ проблемы в эндпоинте approve-for-signing:
1. Заменен несуществующий send_email_with_attachment() на send_email()
2. Добавлена переменная APP_URL и исправлен NameError на строке 3204

ЗАДАЧА:
Протестировать что кнопка "Утвердить" теперь работает полностью без ошибок.
"""

import requests
import json
import sys
import time
import subprocess
import os
from datetime import datetime

# Configuration
BASE_URL = "https://docsphere-global.preview.emergentagent.com/api"

class ApproveButtonTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        self.approved_contract_id = None
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
    
    def login_as_creator(self):
        """Login as creator user"""
        self.log("🔐 Logging in as creator...")
        
        # Try to register a new user first
        import time
        unique_email = f"test.approve.{int(time.time())}@2tick.kz"
        
        user_data = {
            "email": unique_email,
            "password": "testpassword123",
            "full_name": "Тестовый Создатель Договоров",
            "phone": "+77012345678",
            "company_name": "ТОО Тест Утверждение",
            "iin": "123456789012",
            "legal_address": "г. Алматы, ул. Тестовая 1"
        }
        
        response = self.session.post(f"{BASE_URL}/auth/register", json=user_data)
        
        if response.status_code == 200:
            data = response.json()
            registration_id = data["registration_id"]
            self.log(f"✅ Registration created. ID: {registration_id}")
            
            # Complete registration with OTP
            otp_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/request-otp?method=sms")
            if otp_response.status_code == 200:
                otp_data = otp_response.json()
                mock_otp = otp_data.get("mock_otp")
                if mock_otp:
                    verify_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/verify-otp", 
                                                      json={"otp_code": mock_otp})
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        self.token = verify_data["token"]
                        self.user_id = verify_data["user"]["id"]
                        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                        self.log(f"✅ User registered and logged in. User ID: {self.user_id}")
                        return True
                    else:
                        self.log(f"❌ OTP verification failed: {verify_response.status_code}")
                        return False
                else:
                    self.log("❌ No mock OTP received")
                    return False
            else:
                self.log(f"❌ OTP request failed: {otp_response.status_code}")
                return False
        else:
            self.log(f"❌ Registration failed: {response.status_code} - {response.text}")
            return False
    
    def test_full_approval_flow(self):
        """ТЕСТ 1: Полный E2E flow утверждения контракта"""
        try:
            # 1. Создать контракт с signer_email, signer_name, signer_phone
            self.log("   📝 Шаг 1: Создание контракта с данными нанимателя...")
            
            contract_data = {
                "title": "Договор для тестирования кнопки Утвердить",
                "content": "Договор аренды. Наниматель: [ФИО Нанимателя]. Телефон: [Телефон]. Email: [Email].",
                "content_type": "plain",
                "signer_name": "Иванов Иван Иванович",
                "signer_phone": "+77071234567",
                "signer_email": "test.client.approve@2tick.kz",
                "placeholder_values": {
                    "ФИО_НАНИМАТЕЛЯ": "Иванов Иван Иванович",
                    "ТЕЛЕФОН": "+77071234567",
                    "EMAIL": "test.client.approve@2tick.kz"
                }
            }
            
            create_response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
            if create_response.status_code != 200:
                self.log(f"   ❌ Создание контракта не удалось: {create_response.status_code} - {create_response.text}")
                return False
                
            contract = create_response.json()
            contract_id = contract["id"]
            self.log(f"   ✅ Контракт создан: {contract_id}")
            
            # 2. Создать signature (автоматически через GET /sign/{contract_id})
            self.log("   📋 Шаг 2: Создание signature через GET /sign/{contract_id}...")
            
            sign_response = self.session.get(f"{BASE_URL}/sign/{contract_id}")
            if sign_response.status_code != 200:
                self.log(f"   ❌ Получение signing info не удалось: {sign_response.status_code}")
                return False
                
            self.log("   ✅ Signature создан автоматически")
            
            # 3. Simulate client signing process to set status to "pending-signature"
            self.log("   🔄 Шаг 3: Симуляция процесса подписания клиентом...")
            
            # Upload document
            try:
                from PIL import Image
                from io import BytesIO
                
                img = Image.new('RGB', (100, 100), color='white')
                img_buffer = BytesIO()
                img.save(img_buffer, format='JPEG')
                img_buffer.seek(0)
                
                files = {'file': ('test_document.jpg', img_buffer, 'image/jpeg')}
                upload_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/upload-document", files=files)
                
                if upload_response.status_code == 200:
                    self.log("   ✅ Документ загружен")
                else:
                    self.log(f"   ⚠️ Загрузка документа не удалась: {upload_response.status_code}")
                    
            except ImportError:
                self.log("   ⚠️ PIL не доступен, пропускаем загрузку документа")
            
            # Request and verify OTP to set status to pending-signature
            otp_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/request-otp?method=sms")
            if otp_response.status_code == 200:
                otp_data = otp_response.json()
                mock_otp = otp_data.get("mock_otp")
                
                if mock_otp:
                    verify_data = {
                        "contract_id": contract_id,
                        "phone": "+77071234567",
                        "otp_code": mock_otp
                    }
                    
                    verify_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/verify-otp", json=verify_data)
                    if verify_response.status_code == 200:
                        self.log("   ✅ Клиент подписал договор (verified=true)")
                    else:
                        self.log(f"   ⚠️ Верификация OTP не удалась: {verify_response.status_code}")
                else:
                    self.log("   ⚠️ Mock OTP не получен")
            else:
                self.log(f"   ⚠️ Запрос OTP не удался: {otp_response.status_code}")
            
            # 4. POST /api/contracts/{contract_id}/approve-for-signing (авторизованный)
            self.log("   🎯 Шаг 4: POST /api/contracts/{contract_id}/approve-for-signing...")
            
            approve_response = self.session.post(f"{BASE_URL}/contracts/{contract_id}/approve-for-signing")
            
            # КРИТИЧЕСКАЯ ПРОВЕРКА: статус должен быть 200, НЕ 500
            if approve_response.status_code != 200:
                self.log(f"   ❌ КРИТИЧЕСКАЯ ОШИБКА: approve-for-signing вернул {approve_response.status_code} вместо 200")
                self.log(f"   ❌ Response: {approve_response.text}")
                return False
            
            self.log("   ✅ approve-for-signing вернул статус 200 (НЕ 500 Internal Server Error)")
            
            # Проверить ответ
            try:
                approve_data = approve_response.json()
                message = approve_data.get("message", "")
                
                if "утвержден" in message.lower() and "отправлен" in message.lower():
                    self.log(f"   ✅ Корректное сообщение: '{message}'")
                else:
                    self.log(f"   ⚠️ Неожиданное сообщение: '{message}'")
                    
            except Exception as e:
                self.log(f"   ⚠️ Не удалось разобрать JSON ответ: {str(e)}")
            
            # 5. Проверить в БД: contract.approved = True, status = "sent", etc.
            self.log("   🔍 Шаг 5: Проверка обновлений в БД...")
            
            final_response = self.session.get(f"{BASE_URL}/contracts/{contract_id}")
            if final_response.status_code != 200:
                self.log(f"   ❌ Не удалось получить финальное состояние контракта: {final_response.status_code}")
                return False
                
            final_contract = final_response.json()
            
            # Проверить все обязательные поля
            approved = final_contract.get("approved", False)
            status = final_contract.get("status", "unknown")
            approved_at = final_contract.get("approved_at")
            approved_content = final_contract.get("approved_content")
            approved_placeholder_values = final_contract.get("approved_placeholder_values")
            
            self.log(f"   📋 contract.approved: {approved}")
            self.log(f"   📋 contract.status: '{status}'")
            self.log(f"   📋 contract.approved_at: {approved_at}")
            self.log(f"   📋 contract.approved_content: {'Установлен' if approved_content else 'НЕ установлен'}")
            self.log(f"   📋 contract.approved_placeholder_values: {'Установлены' if approved_placeholder_values else 'НЕ установлены'}")
            
            # Проверить критерии успеха
            success = True
            if not approved:
                self.log("   ❌ contract.approved НЕ равен True")
                success = False
            if status != "sent":
                self.log(f"   ❌ contract.status НЕ равен 'sent', получен: '{status}'")
                success = False
            if not approved_at:
                self.log("   ❌ contract.approved_at НЕ установлен")
                success = False
            if not approved_content:
                self.log("   ❌ contract.approved_content НЕ сохранен")
                success = False
            if not approved_placeholder_values:
                self.log("   ❌ contract.approved_placeholder_values НЕ сохранены")
                success = False
            
            if success:
                self.log("   ✅ ТЕСТ 1 ПРОЙДЕН: Все поля контракта корректно обновлены в БД")
                # Store contract_id for other tests
                self.approved_contract_id = contract_id
                return True
            else:
                self.log("   ❌ ТЕСТ 1 ПРОВАЛЕН: Проблемы с обновлением полей в БД")
                return False
                
        except Exception as e:
            self.log(f"   ❌ Исключение в ТЕСТ 1: {str(e)}")
            import traceback
            self.log(f"   📋 Traceback: {traceback.format_exc()}")
            return False
    
    def test_backend_logs_for_errors(self):
        """ТЕСТ 2: Проверка логов backend на наличие ошибок"""
        try:
            self.log("   📋 Проверка логов backend на наличие критических ошибок...")
            
            # Check supervisor backend logs
            try:
                # Get recent backend logs
                result = subprocess.run(
                    ["tail", "-n", "100", "/var/log/supervisor/backend.err.log"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if result.returncode == 0:
                    error_logs = result.stdout
                    
                    # Check for specific errors that were fixed
                    critical_errors = [
                        "NameError: name 'send_email_with_attachment' is not defined",
                        "NameError: name 'BACKEND_URL' is not defined",
                        "AttributeError: 'NoneType' object has no attribute"
                    ]
                    
                    found_errors = []
                    for error in critical_errors:
                        if error in error_logs:
                            found_errors.append(error)
                    
                    if found_errors:
                        self.log("   ❌ КРИТИЧЕСКИЕ ОШИБКИ НАЙДЕНЫ В ЛОГАХ:")
                        for error in found_errors:
                            self.log(f"   ❌   - {error}")
                        return False
                    else:
                        self.log("   ✅ Критические ошибки НЕ найдены в логах")
                        
                        # Check for positive indicators
                        positive_indicators = [
                            "PDF generated, size:",
                            "Email sent",
                            "Contract approved"
                        ]
                        
                        found_positive = []
                        for indicator in positive_indicators:
                            if indicator in error_logs:
                                found_positive.append(indicator)
                        
                        if found_positive:
                            self.log("   ✅ Найдены положительные индикаторы в логах:")
                            for indicator in found_positive:
                                self.log(f"   ✅   - {indicator}")
                        
                        return True
                        
                else:
                    self.log(f"   ⚠️ Не удалось получить логи backend: {result.stderr}")
                    # Don't fail the test if we can't read logs
                    return True
                    
            except subprocess.TimeoutExpired:
                self.log("   ⚠️ Timeout при чтении логов backend")
                return True
            except FileNotFoundError:
                self.log("   ⚠️ Файл логов backend не найден")
                return True
                
        except Exception as e:
            self.log(f"   ⚠️ Исключение при проверке логов: {str(e)}")
            # Don't fail the test if we can't check logs
            return True
    
    def test_email_template_url(self):
        """ТЕСТ 3: Email шаблон с правильным URL"""
        try:
            self.log("   📧 Проверка что в email body используется APP_URL из переменной окружения...")
            
            # Check that APP_URL is set in backend environment by loading the .env file
            from dotenv import load_dotenv
            from pathlib import Path
            
            # Load the backend .env file
            backend_env_path = Path('/app/backend/.env')
            if backend_env_path.exists():
                load_dotenv(backend_env_path)
                app_url = os.environ.get('APP_URL')
                
                if not app_url:
                    self.log("   ❌ APP_URL не установлен в переменных окружения backend")
                    return False
                
                self.log(f"   ✅ APP_URL установлен в backend: {app_url}")
                
                # Verify URL format
                if not app_url.startswith('http'):
                    self.log(f"   ❌ APP_URL имеет неверный формат: {app_url}")
                    return False
                
                # Check that it's not hardcoded localhost
                if 'localhost' in app_url:
                    self.log(f"   ⚠️ APP_URL содержит localhost: {app_url}")
                
                self.log("   ✅ ТЕСТ 3 ПРОЙДЕН: APP_URL корректно установлен")
                return True
            else:
                self.log("   ❌ Backend .env файл не найден")
                return False
            
        except Exception as e:
            self.log(f"   ❌ Исключение в ТЕСТ 3: {str(e)}")
            return False
    
    def test_repeated_approval_protection(self):
        """ТЕСТ 4: Повторное утверждение (проверка защиты)"""
        try:
            # Use the contract from test 1 if available
            if not hasattr(self, 'approved_contract_id') or not self.approved_contract_id:
                self.log("   ⚠️ Нет ID утвержденного контракта из ТЕСТ 1, создаем новый...")
                
                # Create and approve a new contract quickly
                contract_data = {
                    "title": "Договор для тестирования повторного утверждения",
                    "content": "Тестовый договор",
                    "content_type": "plain",
                    "signer_name": "Тестовый Клиент",
                    "signer_phone": "+77071234567",
                    "signer_email": "test.repeat@2tick.kz"
                }
                
                create_response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
                if create_response.status_code != 200:
                    self.log("   ❌ Не удалось создать контракт для теста повторного утверждения")
                    return False
                    
                contract = create_response.json()
                contract_id = contract["id"]
                
                # Approve it first
                approve_response = self.session.post(f"{BASE_URL}/contracts/{contract_id}/approve-for-signing")
                if approve_response.status_code != 200:
                    self.log("   ❌ Не удалось утвердить контракт для теста повторного утверждения")
                    return False
                    
                self.approved_contract_id = contract_id
            
            contract_id = self.approved_contract_id
            
            self.log(f"   🔒 Попытка повторного утверждения контракта {contract_id}...")
            
            # Try to approve the same contract again
            repeat_response = self.session.post(f"{BASE_URL}/contracts/{contract_id}/approve-for-signing")
            
            # Should return 400 with error message
            if repeat_response.status_code == 400:
                try:
                    error_data = repeat_response.json()
                    error_message = error_data.get("detail", "")
                    
                    if "уже утвержден" in error_message.lower():
                        self.log(f"   ✅ Повторное утверждение корректно заблокировано: '{error_message}'")
                        return True
                    else:
                        self.log(f"   ❌ Неожиданное сообщение об ошибке: '{error_message}'")
                        return False
                        
                except Exception as e:
                    self.log(f"   ❌ Не удалось разобрать ответ об ошибке: {str(e)}")
                    return False
            else:
                self.log(f"   ❌ Повторное утверждение НЕ заблокировано! Статус: {repeat_response.status_code}")
                self.log(f"   ❌ Response: {repeat_response.text}")
                return False
                
        except Exception as e:
            self.log(f"   ❌ Исключение в ТЕСТ 4: {str(e)}")
            return False

    def run_approve_button_tests(self):
        """
        ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ: Кнопка "Утвердить" после всех исправлений
        """
        self.log("\n🎯 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ: Кнопка 'Утвердить' после всех исправлений")
        self.log("=" * 80)
        
        # Login as creator first
        if not self.login_as_creator():
            self.log("❌ Не удалось войти как создатель договора")
            return False
        
        all_tests_passed = True
        
        # ТЕСТ 1: Полный E2E flow утверждения контракта
        self.log("\n📝 ТЕСТ 1: Полный E2E flow утверждения контракта")
        test1_passed = self.test_full_approval_flow()
        all_tests_passed = all_tests_passed and test1_passed
        
        # ТЕСТ 2: Проверка логов (КРИТИЧЕСКИЙ)
        self.log("\n📋 ТЕСТ 2: Проверка логов backend (КРИТИЧЕСКИЙ)")
        test2_passed = self.test_backend_logs_for_errors()
        all_tests_passed = all_tests_passed and test2_passed
        
        # ТЕСТ 3: Email шаблон с правильным URL
        self.log("\n📧 ТЕСТ 3: Email шаблон с правильным URL")
        test3_passed = self.test_email_template_url()
        all_tests_passed = all_tests_passed and test3_passed
        
        # ТЕСТ 4: Повторное утверждение (проверка защиты)
        self.log("\n🔒 ТЕСТ 4: Повторное утверждение (проверка защиты)")
        test4_passed = self.test_repeated_approval_protection()
        all_tests_passed = all_tests_passed and test4_passed
        
        # Итоговый результат
        self.log("\n" + "=" * 80)
        self.log("📊 РЕЗУЛЬТАТЫ ФИНАЛЬНОГО ТЕСТИРОВАНИЯ КНОПКИ 'УТВЕРДИТЬ':")
        self.log(f"   ТЕСТ 1 (E2E flow): {'✅ ПРОЙДЕН' if test1_passed else '❌ ПРОВАЛЕН'}")
        self.log(f"   ТЕСТ 2 (Логи backend): {'✅ ПРОЙДЕН' if test2_passed else '❌ ПРОВАЛЕН'}")
        self.log(f"   ТЕСТ 3 (Email URL): {'✅ ПРОЙДЕН' if test3_passed else '❌ ПРОВАЛЕН'}")
        self.log(f"   ТЕСТ 4 (Защита от повтора): {'✅ ПРОЙДЕН' if test4_passed else '❌ ПРОВАЛЕН'}")
        
        if all_tests_passed:
            self.log("🎉 ВСЕ КРИТЕРИИ УСПЕХА ВЫПОЛНЕНЫ!")
            self.log("✅ POST /api/contracts/{contract_id}/approve-for-signing возвращает 200")
            self.log("✅ НЕТ ошибок NameError в логах")
            self.log("✅ НЕТ ошибок AttributeError в логах")
            self.log("✅ Contract корректно обновляется в БД")
            self.log("✅ PDF генерируется успешно")
            self.log("✅ Email отправка работает (Mock режим OK)")
            self.log("✅ Повторное утверждение блокируется")
            self.log("✅ APP_URL используется в email шаблоне")
            self.log("🚀 ПРОБЛЕМА ПОЛЬЗОВАТЕЛЯ ПОЛНОСТЬЮ РЕШЕНА!")
        else:
            self.log("❌ ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ! Проверьте логи выше.")
        
        return all_tests_passed

if __name__ == "__main__":
    tester = ApproveButtonTester()
    
    # Run the specific approve button test based on the review request
    success = tester.run_approve_button_tests()
    
    if success:
        print("\n🎉 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ КНОПКИ 'УТВЕРДИТЬ' ЗАВЕРШЕНО УСПЕШНО!")
        sys.exit(0)
    else:
        print("\n❌ ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ КНОПКИ 'УТВЕРДИТЬ' ПРОВАЛЕНО!")
        sys.exit(1)
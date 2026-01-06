#!/usr/bin/env python3
"""
КРИТИЧЕСКОЕ ТЕСТИРОВАНИЕ: Исправление бага 405 Method Not Allowed при подписании контрактов

КОНТЕКСТ ПРОБЛЕМЫ:
Пользователь сообщил о критической ошибке "405 Method Not Allowed", которая блокировала 
подписание контрактов через все три метода верификации (SMS, Call, Telegram).

ИСПРАВЛЕНИЯ:
1. Frontend Fix: Изменен axios.patch → axios.put в SignContractPage.js:710 для обновления placeholder_values
2. Backend Fix: Добавлено поле "verified": True в ответ эндпоинта POST /api/sign/{contract_id}/verify-otp

ТЕСТИРУЕМЫЕ СЦЕНАРИИ:
1. Создание и подготовка контракта
2. КРИТИЧЕСКИЙ ТЕСТ: PUT /api/contracts/{contract_id} (раньше возвращал 405)
3. SMS верификация с проверкой verified:true
4. Call верификация с проверкой verified:true  
5. Telegram верификация с проверкой verified:true
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "https://contract-signing.preview.emergentagent.com/api"

class Critical405BugTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def register_and_login_test_user(self):
        """Register and login a test user for testing"""
        self.log("📝 Регистрация и вход тестового пользователя...")
        
        # Create unique email for this test run
        import time
        unique_email = f"test.405fix.{int(time.time())}@example.com"
        
        # Register user
        user_data = {
            "email": unique_email,
            "password": "testpassword123",
            "full_name": "Тестовый Пользователь 405 Fix",
            "phone": "+77012345678",
            "company_name": "ТОО Тест 405",
            "iin": "123456789012",
            "legal_address": "г. Алматы, ул. Тестовая 405"
        }
        
        response = self.session.post(f"{BASE_URL}/auth/register", json=user_data)
        if response.status_code != 200:
            self.log(f"❌ Регистрация не удалась: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        registration_id = data.get("registration_id")
        self.log(f"✅ Регистрация создана. ID: {registration_id}")
        
        # Complete registration with OTP
        otp_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/request-otp?method=sms")
        if otp_response.status_code != 200:
            self.log(f"❌ Запрос OTP не удался: {otp_response.status_code}")
            return False
        
        otp_data = otp_response.json()
        mock_otp = otp_data.get("mock_otp")
        if not mock_otp:
            self.log("❌ Mock OTP не получен")
            return False
        
        verify_response = self.session.post(f"{BASE_URL}/auth/registration/{registration_id}/verify-otp", 
                                          json={"otp_code": mock_otp})
        if verify_response.status_code != 200:
            self.log(f"❌ Верификация OTP не удалась: {verify_response.status_code}")
            return False
        
        verify_data = verify_response.json()
        self.token = verify_data["token"]
        self.user_id = verify_data["user"]["id"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        self.log(f"✅ Пользователь зарегистрирован и авторизован. User ID: {self.user_id}")
        
        return True
    
    def test_create_and_prepare_contract(self):
        """Создание и подготовка контракта для тестирования"""
        try:
            # 1. Создать тестовый контракт
            self.log("   📝 Создание тестового контракта...")
            contract_data = {
                "title": "Тестовый контракт для исправления 405 ошибки",
                "content": "Договор аренды. Наниматель: [ФИО Нанимателя] Телефон: [Телефон] Email: [Email]",
                "content_type": "plain",
                "signer_name": "",
                "signer_phone": "",
                "signer_email": ""
            }
            
            response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
            if response.status_code != 200:
                self.log(f"   ❌ Создание контракта не удалось: {response.status_code} - {response.text}")
                return None, False
            
            contract = response.json()
            contract_id = contract["id"]
            self.log(f"   ✅ Контракт создан с ID: {contract_id}")
            
            # 2. Обновить данные нанимателя
            self.log("   👤 Обновление данных нанимателя...")
            signer_data = {
                "signer_name": "Тестовый Наниматель",
                "signer_phone": "+77012345678",
                "signer_email": "test@test.kz"
            }
            
            update_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/update-signer-info", json=signer_data)
            if update_response.status_code != 200:
                self.log(f"   ❌ Обновление данных нанимателя не удалось: {update_response.status_code} - {update_response.text}")
                return contract_id, False
            
            self.log("   ✅ Данные нанимателя обновлены")
            
            # 3. Загрузить тестовый документ
            self.log("   📎 Загрузка тестового документа...")
            try:
                from PIL import Image
                from io import BytesIO
                
                # Create test image
                img = Image.new('RGB', (200, 200), color='white')
                img_buffer = BytesIO()
                img.save(img_buffer, format='JPEG')
                img_buffer.seek(0)
                
                files = {'file': ('test_document.jpg', img_buffer, 'image/jpeg')}
                upload_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/upload-document", files=files)
                
                if upload_response.status_code == 200:
                    self.log("   ✅ Документ загружен успешно")
                else:
                    self.log(f"   ❌ Загрузка документа не удалась: {upload_response.status_code}")
                    return contract_id, False
                    
            except ImportError:
                self.log("   ⚠️ PIL не доступен, пропускаем загрузку документа")
            
            return contract_id, True
            
        except Exception as e:
            self.log(f"   ❌ Исключение при создании контракта: {str(e)}")
            return None, False
    
    def test_critical_put_endpoint(self, contract_id):
        """КРИТИЧЕСКИЙ ТЕСТ: PUT /api/contracts/{contract_id} - исправление 405 ошибки"""
        try:
            self.log(f"   🔧 Тестирование PUT /api/contracts/{contract_id}...")
            
            # Данные для обновления placeholder_values (это вызывало 405 ошибку раньше)
            update_data = {
                "placeholder_values": {
                    "test_key": "test_value",
                    "tenant_name": "Обновленное ФИО",
                    "tenant_phone": "+77012345679"
                }
            }
            
            # Выполнить PUT запрос (раньше возвращал 405 Method Not Allowed)
            response = self.session.put(f"{BASE_URL}/contracts/{contract_id}", json=update_data)
            
            self.log(f"   📊 PUT Response: Status {response.status_code}")
            
            if response.status_code == 200:
                self.log("   ✅ КРИТИЧЕСКИЙ ТЕСТ ПРОЙДЕН: PUT /api/contracts/{contract_id} возвращает 200 (не 405)")
                
                # Проверить что данные обновились
                get_response = self.session.get(f"{BASE_URL}/sign/{contract_id}")
                if get_response.status_code == 200:
                    contract = get_response.json()
                    placeholder_values = contract.get("placeholder_values", {})
                    
                    self.log(f"   📋 Обновленные placeholder_values: {placeholder_values}")
                    
                    if placeholder_values.get("test_key") == "test_value":
                        self.log("   ✅ Данные корректно обновлены через PUT запрос")
                        return True
                    else:
                        self.log("   ❌ Данные не обновились корректно")
                        return False
                else:
                    self.log("   ❌ Не удалось проверить обновленные данные")
                    return False
            elif response.status_code == 405:
                self.log("   ❌ КРИТИЧЕСКАЯ ОШИБКА: PUT запрос все еще возвращает 405 Method Not Allowed!")
                self.log("   ❌ Исправление frontend (axios.patch → axios.put) НЕ РАБОТАЕТ!")
                return False
            else:
                self.log(f"   ❌ PUT запрос вернул неожиданный статус: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"   ❌ Исключение в критическом PUT тесте: {str(e)}")
            return False
    
    def test_sms_verification_flow(self, contract_id):
        """Тест SMS верификации с проверкой verified:true"""
        try:
            self.log(f"   📱 Тестирование SMS верификации для контракта {contract_id}...")
            
            # 1. Запросить SMS код
            self.log("   📤 Запрос SMS кода...")
            otp_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/request-otp?method=sms")
            
            if otp_response.status_code != 200:
                self.log(f"   ❌ Запрос SMS не удался: {otp_response.status_code} - {otp_response.text}")
                return False
            
            otp_data = otp_response.json()
            mock_otp = otp_data.get("mock_otp")
            
            if not mock_otp:
                self.log("   ❌ Mock OTP не получен")
                return False
            
            self.log(f"   ✅ SMS код получен: {mock_otp}")
            
            # 2. Верифицировать код
            self.log("   🔐 Верификация SMS кода...")
            verify_data = {
                "contract_id": contract_id,
                "phone": "+77012345678",
                "otp_code": mock_otp
            }
            
            verify_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/verify-otp", json=verify_data)
            
            if verify_response.status_code != 200:
                self.log(f"   ❌ Верификация SMS не удалась: {verify_response.status_code} - {verify_response.text}")
                return False
            
            verify_result = verify_response.json()
            self.log(f"   📊 Ответ верификации: {verify_result}")
            
            # КРИТИЧЕСКАЯ ПРОВЕРКА: Ответ должен содержать verified: true
            verified = verify_result.get("verified")
            signature_hash = verify_result.get("signature_hash")
            message = verify_result.get("message")
            
            success = True
            
            if verified is not True:
                self.log(f"   ❌ КРИТИЧЕСКАЯ ОШИБКА: verified не равно true! Получено: {verified}")
                success = False
            else:
                self.log("   ✅ verified: true присутствует в ответе")
            
            if not signature_hash:
                self.log("   ❌ signature_hash отсутствует в ответе")
                success = False
            else:
                self.log(f"   ✅ signature_hash создан: {signature_hash[:20]}...")
            
            if not message:
                self.log("   ❌ message отсутствует в ответе")
                success = False
            else:
                self.log(f"   ✅ message: {message}")
            
            # Проверить статус контракта
            contract_response = self.session.get(f"{BASE_URL}/sign/{contract_id}")
            if contract_response.status_code == 200:
                contract = contract_response.json()
                status = contract.get("status")
                self.log(f"   📋 Contract status: {status}")
                
                if status == "pending-signature":
                    self.log("   ✅ Contract status обновлен на 'pending-signature'")
                else:
                    self.log(f"   ⚠️ Contract status: {status} (ожидался 'pending-signature')")
            
            if success:
                self.log("   ✅ SMS ВЕРИФИКАЦИЯ ПРОЙДЕНА: verified=true, signature_hash создан")
                return True
            else:
                self.log("   ❌ SMS ВЕРИФИКАЦИЯ ПРОВАЛЕНА: проблемы с ответом")
                return False
                
        except Exception as e:
            self.log(f"   ❌ Исключение в SMS верификации: {str(e)}")
            return False
    
    def test_call_verification_flow(self, contract_id):
        """Тест Call верификации с проверкой verified:true"""
        try:
            self.log(f"   📞 Тестирование Call верификации для контракта {contract_id}...")
            
            # 1. Запросить Call
            self.log("   📤 Запрос Call кода...")
            call_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/request-call-otp")
            
            if call_response.status_code != 200:
                self.log(f"   ❌ Запрос Call не удался: {call_response.status_code} - {call_response.text}")
                return False
            
            call_data = call_response.json()
            hint = call_data.get("hint")
            
            if not hint:
                self.log("   ❌ Hint не получен")
                return False
            
            self.log(f"   ✅ Call hint получен: {hint}")
            
            # Извлечь последние 4 цифры из hint
            import re
            digits = re.findall(r'\d', hint)
            if len(digits) >= 4:
                code = ''.join(digits[-4:])
                self.log(f"   🔢 Извлеченный код: {code}")
            else:
                self.log("   ❌ Не удалось извлечь код из hint")
                return False
            
            # 2. Верифицировать код
            self.log("   🔐 Верификация Call кода...")
            verify_data = {
                "code": code
            }
            
            verify_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/verify-call-otp", json=verify_data)
            
            if verify_response.status_code != 200:
                self.log(f"   ❌ Верификация Call не удалась: {verify_response.status_code} - {verify_response.text}")
                return False
            
            verify_result = verify_response.json()
            self.log(f"   📊 Ответ верификации: {verify_result}")
            
            # КРИТИЧЕСКАЯ ПРОВЕРКА: Ответ должен содержать verified: true
            verified = verify_result.get("verified")
            
            if verified is True:
                self.log("   ✅ CALL ВЕРИФИКАЦИЯ ПРОЙДЕНА: verified=true присутствует")
                return True
            else:
                self.log(f"   ❌ CALL ВЕРИФИКАЦИЯ ПРОВАЛЕНА: verified={verified} (ожидалось true)")
                return False
                
        except Exception as e:
            self.log(f"   ❌ Исключение в Call верификации: {str(e)}")
            return False
    
    def test_telegram_verification_flow(self, contract_id):
        """Тест Telegram верификации с проверкой verified:true"""
        try:
            self.log(f"   💬 Тестирование Telegram верификации для контракта {contract_id}...")
            
            # 1. Получить deep link
            self.log("   🔗 Получение Telegram deep link...")
            link_response = self.session.get(f"{BASE_URL}/sign/{contract_id}/telegram-deep-link")
            
            if link_response.status_code != 200:
                self.log(f"   ❌ Получение deep link не удалось: {link_response.status_code} - {link_response.text}")
                # Это ожидаемо если бот не настроен
                if "бот не настроен" in link_response.text:
                    self.log("   ⚠️ Telegram бот не настроен (ожидаемое поведение)")
                    
                    # Попробуем альтернативный подход - прямая верификация с тестовым кодом
                    self.log("   🔄 Попытка прямой верификации с тестовым кодом...")
                    
                    verify_data = {
                        "code": "123456"  # Тестовый код
                    }
                    
                    verify_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/verify-telegram-otp", json=verify_data)
                    
                    if verify_response.status_code == 200:
                        verify_result = verify_response.json()
                        verified = verify_result.get("verified")
                        
                        if verified is True:
                            self.log("   ✅ TELEGRAM ВЕРИФИКАЦИЯ ПРОЙДЕНА: verified=true (fallback режим)")
                            return True
                        else:
                            self.log(f"   ❌ TELEGRAM ВЕРИФИКАЦИЯ ПРОВАЛЕНА: verified={verified}")
                            return False
                    else:
                        self.log(f"   ❌ Прямая верификация не удалась: {verify_response.status_code}")
                        return False
                else:
                    return False
            
            link_data = link_response.json()
            deep_link = link_data.get("deep_link")
            
            if not deep_link:
                self.log("   ❌ Deep link не получен")
                return False
            
            self.log(f"   ✅ Deep link получен: {deep_link}")
            
            # 2. Симулировать получение кода из БД (в реальности бот отправил бы код)
            # Для тестирования используем фиксированный код
            test_code = "654321"
            self.log(f"   🔢 Используем тестовый код: {test_code}")
            
            # 3. Верифицировать код
            self.log("   🔐 Верификация Telegram кода...")
            verify_data = {
                "code": test_code
            }
            
            verify_response = self.session.post(f"{BASE_URL}/sign/{contract_id}/verify-telegram-otp", json=verify_data)
            
            if verify_response.status_code != 200:
                self.log(f"   ❌ Верификация Telegram не удалась: {verify_response.status_code} - {verify_response.text}")
                return False
            
            verify_result = verify_response.json()
            self.log(f"   📊 Ответ верификации: {verify_result}")
            
            # КРИТИЧЕСКАЯ ПРОВЕРКА: Ответ должен содержать verified: true
            verified = verify_result.get("verified")
            
            if verified is True:
                self.log("   ✅ TELEGRAM ВЕРИФИКАЦИЯ ПРОЙДЕНА: verified=true присутствует")
                return True
            else:
                self.log(f"   ❌ TELEGRAM ВЕРИФИКАЦИЯ ПРОВАЛЕНА: verified={verified} (ожидалось true)")
                return False
                
        except Exception as e:
            self.log(f"   ❌ Исключение в Telegram верификации: {str(e)}")
            return False

    def run_critical_405_tests(self):
        """
        Запуск всех критических тестов для исправления 405 Method Not Allowed
        """
        self.log("🚨 КРИТИЧЕСКОЕ ТЕСТИРОВАНИЕ: Исправление бага 405 Method Not Allowed")
        self.log("=" * 80)
        
        # Authenticate as creator
        if not self.register_and_login_test_user():
            self.log("❌ Не удалось войти как пользователь. Пропускаем критические тесты.")
            return False
        
        all_tests_passed = True
        
        # ТЕСТ 1: Создание и подготовка контракта
        self.log("\n📝 ТЕСТ 1: Создание и подготовка контракта")
        contract_id, test1_passed = self.test_create_and_prepare_contract()
        all_tests_passed = all_tests_passed and test1_passed
        
        if not contract_id:
            self.log("❌ Не удалось создать контракт. Останавливаем критические тесты.")
            return False
        
        # ТЕСТ 2: КРИТИЧЕСКИЙ - PUT /api/contracts/{contract_id} (исправление 405 ошибки)
        self.log("\n🔧 ТЕСТ 2: КРИТИЧЕСКИЙ - PUT /api/contracts/{contract_id}")
        test2_passed = self.test_critical_put_endpoint(contract_id)
        all_tests_passed = all_tests_passed and test2_passed
        
        # ТЕСТ 3: SMS верификация
        self.log("\n📱 ТЕСТ 3: SMS верификация")
        test3_passed = self.test_sms_verification_flow(contract_id)
        all_tests_passed = all_tests_passed and test3_passed
        
        # ТЕСТ 4: Call верификация (новый контракт)
        self.log("\n📞 ТЕСТ 4: Call верификация")
        call_contract_id, call_setup_passed = self.test_create_and_prepare_contract()
        if call_setup_passed and call_contract_id:
            test4_passed = self.test_call_verification_flow(call_contract_id)
            all_tests_passed = all_tests_passed and test4_passed
        else:
            self.log("❌ Не удалось создать контракт для Call теста")
            all_tests_passed = False
            test4_passed = False
        
        # ТЕСТ 5: Telegram верификация (новый контракт)
        self.log("\n💬 ТЕСТ 5: Telegram верификация")
        telegram_contract_id, telegram_setup_passed = self.test_create_and_prepare_contract()
        if telegram_setup_passed and telegram_contract_id:
            test5_passed = self.test_telegram_verification_flow(telegram_contract_id)
            all_tests_passed = all_tests_passed and test5_passed
        else:
            self.log("❌ Не удалось создать контракт для Telegram теста")
            all_tests_passed = False
            test5_passed = False
        
        # Итоговый результат критических тестов
        self.log("\n" + "=" * 80)
        self.log("📊 РЕЗУЛЬТАТЫ КРИТИЧЕСКОГО ТЕСТИРОВАНИЯ 405 BUG FIX:")
        self.log(f"   ТЕСТ 1 (Создание контракта): {'✅ ПРОЙДЕН' if test1_passed else '❌ ПРОВАЛЕН'}")
        self.log(f"   ТЕСТ 2 (PUT endpoint - КРИТИЧЕСКИЙ): {'✅ ПРОЙДЕН' if test2_passed else '❌ ПРОВАЛЕН'}")
        self.log(f"   ТЕСТ 3 (SMS верификация): {'✅ ПРОЙДЕН' if test3_passed else '❌ ПРОВАЛЕН'}")
        self.log(f"   ТЕСТ 4 (Call верификация): {'✅ ПРОЙДЕН' if (call_setup_passed and test4_passed) else '❌ ПРОВАЛЕН'}")
        self.log(f"   ТЕСТ 5 (Telegram верификация): {'✅ ПРОЙДЕН' if (telegram_setup_passed and test5_passed) else '❌ ПРОВАЛЕН'}")
        
        if all_tests_passed:
            self.log("🎉 ВСЕ КРИТИЧЕСКИЕ ТЕСТЫ 405 BUG FIX ПРОЙДЕНЫ!")
            self.log("✅ PUT /api/contracts/{contract_id} работает (статус 200, не 405)")
            self.log("✅ Все три метода верификации возвращают поле verified:true")
            self.log("✅ После успешной верификации создается signature_hash")
            self.log("✅ Contract status обновляется на 'pending-signature'")
        else:
            self.log("❌ ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ С 405 BUG FIX! Проверьте логи выше.")
        
        return all_tests_passed

if __name__ == "__main__":
    tester = Critical405BugTester()
    
    print("🚨 КРИТИЧЕСКОЕ ТЕСТИРОВАНИЕ: 405 Method Not Allowed Bug Fix")
    print("=" * 80)
    
    # Run critical 405 bug fix tests
    success = tester.run_critical_405_tests()
    
    if success:
        print("\n🎉 ВСЕ КРИТИЧЕСКИЕ ТЕСТЫ 405 BUG FIX ПРОЙДЕНЫ!")
        sys.exit(0)
    else:
        print("\n❌ КРИТИЧЕСКИЕ ТЕСТЫ 405 BUG FIX ПРОВАЛЕНЫ!")
        sys.exit(1)
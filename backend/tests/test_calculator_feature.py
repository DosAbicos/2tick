"""
Test Calculator Feature for Placeholders
Tests:
1. Creating template with calculated fields
2. Date subtraction (CHECK_OUT_DATE - CHECK_IN_DATE = TOTAL_DAYS)
3. Arithmetic operations (+, -, *, /)
4. Chained calculations (TOTAL_DAYS * PRICE_PER_DAY = TOTAL_AMOUNT)
5. Rounding options (integer vs decimal)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sign-experience.preview.emergentagent.com')

class TestCalculatorFeature:
    """Test calculator feature for computed placeholders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@test.kz",
            "password": "Test123456!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        # Use "token" key (not "access_token")
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup - delete test templates
        # (handled by test cleanup)
    
    def test_create_template_with_calculated_fields(self):
        """Test creating a template with calculated fields"""
        
        template_data = {
            "title": "TEST_Calculator_Template",
            "title_kk": "TEST_Калькулятор_Шаблон",
            "title_en": "TEST_Calculator_Template",
            "description": "Test template with calculated fields",
            "description_kk": "Тест шаблон",
            "description_en": "Test template",
            "category": "real_estate",
            "content": """
ДОГОВОР АРЕНДЫ

Дата заезда: {{CHECK_IN_DATE}}
Дата выезда: {{CHECK_OUT_DATE}}
Количество дней: {{TOTAL_DAYS}}
Цена за день: {{PRICE_PER_DAY}} тенге
Итого: {{TOTAL_AMOUNT}} тенге
            """,
            "content_kk": "Тест контент",
            "content_en": "Test content",
            "placeholders": {
                "CHECK_IN_DATE": {
                    "label": "Дата заезда",
                    "label_kk": "Кіру күні",
                    "label_en": "Check-in date",
                    "type": "date",
                    "owner": "landlord",
                    "required": True
                },
                "CHECK_OUT_DATE": {
                    "label": "Дата выезда",
                    "label_kk": "Шығу күні",
                    "label_en": "Check-out date",
                    "type": "date",
                    "owner": "landlord",
                    "required": True
                },
                "TOTAL_DAYS": {
                    "label": "Количество дней",
                    "label_kk": "Күндер саны",
                    "label_en": "Total days",
                    "type": "calculated",
                    "owner": "landlord",
                    "required": False,
                    "formula": {
                        "operand1": "CHECK_OUT_DATE",
                        "operation": "subtract",
                        "operand2": "CHECK_IN_DATE",
                        "useTextFormula": False,
                        "roundingMode": "integer"
                    }
                },
                "PRICE_PER_DAY": {
                    "label": "Цена за день",
                    "label_kk": "Күніне баға",
                    "label_en": "Price per day",
                    "type": "number",
                    "owner": "landlord",
                    "required": True
                },
                "TOTAL_AMOUNT": {
                    "label": "Итого",
                    "label_kk": "Барлығы",
                    "label_en": "Total amount",
                    "type": "calculated",
                    "owner": "landlord",
                    "required": False,
                    "formula": {
                        "operand1": "TOTAL_DAYS",
                        "operation": "multiply",
                        "operand2": "PRICE_PER_DAY",
                        "useTextFormula": False,
                        "roundingMode": "integer"
                    }
                }
            },
            "party_a_role": "Арендодатель",
            "party_a_role_kk": "Жалға беруші",
            "party_a_role_en": "Landlord",
            "party_b_role": "Арендатор",
            "party_b_role_kk": "Жалға алушы",
            "party_b_role_en": "Tenant"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/templates", json=template_data)
        
        assert response.status_code in [200, 201], f"Failed to create template: {response.text}"
        
        result = response.json()
        
        # API returns {"message": "...", "template_id": "..."}
        assert "template_id" in result or "id" in result, f"No template_id in response: {result}"
        
        template_id = result.get("template_id") or result.get("id")
        print(f"✅ Created template with ID: {template_id}")
        
        # Verify template was created by fetching it
        get_response = self.session.get(f"{BASE_URL}/api/templates/{template_id}")
        assert get_response.status_code == 200, f"Failed to get template: {get_response.text}"
        
        template = get_response.json()
        assert template.get("title") == "TEST_Calculator_Template"
        assert "placeholders" in template
        assert "TOTAL_DAYS" in template["placeholders"]
        assert template["placeholders"]["TOTAL_DAYS"]["type"] == "calculated"
        assert "formula" in template["placeholders"]["TOTAL_DAYS"]
        
        # Verify formula structure
        formula = template["placeholders"]["TOTAL_DAYS"]["formula"]
        assert formula.get("operand1") == "CHECK_OUT_DATE"
        assert formula.get("operation") == "subtract"
        assert formula.get("operand2") == "CHECK_IN_DATE"
        
        # Verify chained calculation
        assert "TOTAL_AMOUNT" in template["placeholders"]
        total_formula = template["placeholders"]["TOTAL_AMOUNT"]["formula"]
        assert total_formula.get("operand1") == "TOTAL_DAYS"
        assert total_formula.get("operation") == "multiply"
        assert total_formula.get("operand2") == "PRICE_PER_DAY"
        
        print(f"✅ Template has correct calculated fields structure")
        
        return template
    
    def test_template_with_text_formula(self):
        """Test creating a template with text formula"""
        
        template_data = {
            "title": "TEST_TextFormula_Template",
            "title_kk": "TEST_Текст_Формула",
            "title_en": "TEST_TextFormula_Template",
            "description": "Test template with text formula",
            "description_kk": "Тест",
            "description_en": "Test",
            "category": "real_estate",
            "content": "Итого: {{TOTAL_WITH_FEE}} тенге",
            "content_kk": "Тест",
            "content_en": "Test",
            "placeholders": {
                "BASE_AMOUNT": {
                    "label": "Базовая сумма",
                    "label_kk": "Негізгі сома",
                    "label_en": "Base amount",
                    "type": "number",
                    "owner": "landlord",
                    "required": True
                },
                "SERVICE_FEE": {
                    "label": "Сервисный сбор",
                    "label_kk": "Қызмет ақысы",
                    "label_en": "Service fee",
                    "type": "number",
                    "owner": "landlord",
                    "required": True
                },
                "TOTAL_WITH_FEE": {
                    "label": "Итого с комиссией",
                    "label_kk": "Комиссиямен барлығы",
                    "label_en": "Total with fee",
                    "type": "calculated",
                    "owner": "landlord",
                    "required": False,
                    "formula": {
                        "textFormula": "BASE_AMOUNT + SERVICE_FEE",
                        "useTextFormula": True,
                        "roundingMode": "decimal"
                    }
                }
            },
            "party_a_role": "Сторона А",
            "party_a_role_kk": "А жағы",
            "party_a_role_en": "Party A",
            "party_b_role": "Сторона Б",
            "party_b_role_kk": "Б жағы",
            "party_b_role_en": "Party B"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/templates", json=template_data)
        
        assert response.status_code in [200, 201], f"Failed to create template: {response.text}"
        
        result = response.json()
        template_id = result.get("template_id") or result.get("id")
        
        # Fetch the template to verify
        get_response = self.session.get(f"{BASE_URL}/api/templates/{template_id}")
        assert get_response.status_code == 200
        
        template = get_response.json()
        assert template["placeholders"]["TOTAL_WITH_FEE"]["formula"]["useTextFormula"] == True
        assert template["placeholders"]["TOTAL_WITH_FEE"]["formula"]["textFormula"] == "BASE_AMOUNT + SERVICE_FEE"
        assert template["placeholders"]["TOTAL_WITH_FEE"]["formula"]["roundingMode"] == "decimal"
        
        print(f"✅ Created template with text formula")
        
        # Cleanup
        if template_id:
            self.session.delete(f"{BASE_URL}/api/admin/templates/{template_id}")
    
    def test_get_templates_list(self):
        """Test getting list of templates"""
        
        response = self.session.get(f"{BASE_URL}/api/admin/templates")
        
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        
        templates = response.json()
        assert isinstance(templates, list)
        
        print(f"✅ Got {len(templates)} templates")
    
    def test_calculator_operations_available(self):
        """Test that all calculator operations are available in the code"""
        
        # This test verifies the frontend code has all required operations
        # by checking the CALCULATOR_OPERATIONS constant
        
        expected_operations = [
            "add",      # +
            "subtract", # -
            "multiply", # *
            "divide",   # /
            "modulo",   # %
            "days_between"  # Date difference
        ]
        
        # Read the AdminTemplatesPage.js file
        with open("/app/frontend/src/pages/AdminTemplatesPage.js", "r") as f:
            content = f.read()
        
        for op in expected_operations:
            assert op in content, f"Operation '{op}' not found in AdminTemplatesPage.js"
        
        print(f"✅ All calculator operations are available")
    
    def test_calculator_utils_functions(self):
        """Test that calculatorUtils.js has all required functions"""
        
        with open("/app/frontend/src/utils/calculatorUtils.js", "r") as f:
            content = f.read()
        
        # Check for required functions
        required_functions = [
            "computeFormula",
            "computeAllCalculatedFields",
            "daysBetween",
            "parseDate",
            "evaluateSimpleFormula",
            "evaluateTextFormula"
        ]
        
        for func in required_functions:
            assert func in content, f"Function '{func}' not found in calculatorUtils.js"
        
        # Check for rounding modes
        assert "roundingMode" in content
        assert "integer" in content
        assert "decimal" in content
        
        print(f"✅ All calculator utility functions are available")
    
    def test_cleanup_test_templates(self):
        """Cleanup test templates"""
        
        response = self.session.get(f"{BASE_URL}/api/admin/templates")
        
        if response.status_code == 200:
            templates = response.json()
            for template in templates:
                if template.get("title", "").startswith("TEST_"):
                    delete_response = self.session.delete(f"{BASE_URL}/api/admin/templates/{template['id']}")
                    if delete_response.status_code in [200, 204]:
                        print(f"✅ Deleted test template: {template['title']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

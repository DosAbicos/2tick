from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, Frame
from fastapi.responses import StreamingResponse, Response
import random
import base64
import hashlib
import time
import httpx

# psutil for system metrics (optional - may not work in all environments)
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    psutil = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Application URL
APP_URL = os.environ.get('APP_URL', 'http://localhost:3000')

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'signify-kz-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Email Configuration - SMTP only
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@2tick.kz')
USE_SMTP = os.environ.get('USE_SMTP', 'false').lower() == 'true'
SMTP_HOST = os.environ.get('SMTP_HOST', 'mail.2tick.kz')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '25'))
SMTP_USER = os.environ.get('SMTP_USER', 'noreply@2tick.kz')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_BOT_USERNAME = os.environ.get('TELEGRAM_BOT_USERNAME', 'twotick_bot')

# KazInfoTech SMS Configuration (единственный SMS провайдер)
KAZINFOTECH_API_URL = os.environ.get('KAZINFOTECH_API_URL', 'http://212.124.121.186:9507/api')
KAZINFOTECH_USERNAME = os.environ.get('KAZINFOTECH_USERNAME', '')
KAZINFOTECH_PASSWORD = os.environ.get('KAZINFOTECH_PASSWORD', '')
KAZINFOTECH_SENDER = os.environ.get('KAZINFOTECH_SENDER', 'INFO')

# Log SMS provider status
if KAZINFOTECH_USERNAME and KAZINFOTECH_PASSWORD:
    logging.info(f"✅ KazInfoTech HTTP API configured (sender: {KAZINFOTECH_SENDER})")
else:
    logging.warning("⚠️ KazInfoTech not configured - SMS will not work")

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===== HELPER FUNCTIONS =====
async def generate_unique_user_id():
    """Generate a unique random 10-digit user ID"""
    while True:
        user_id = str(random.randint(1000000000, 9999999999))
        # Check if ID already exists in database
        existing = await db.users.find_one({"id": user_id})
        if not existing:
            return user_id

# ===== MODELS =====
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = ""  # Will be set during user creation
    email: EmailStr
    full_name: str
    phone: str
    role: str = "creator"  # creator, signer, admin
    language: str = "ru"  # ru, kk, en
    iin: Optional[str] = None  # ИИН/БИН (Individual/Business Identification Number)
    company_name: Optional[str] = None  # Название компании
    legal_address: Optional[str] = None  # Юридический адрес
    document_upload: Optional[str] = None  # Landlord's ID/passport
    document_filename: Optional[str] = None
    contract_limit: int = 3  # Лимит на количество договоров (по умолчанию 3)
    is_admin: bool = False  # Администратор
    favorite_templates: List[str] = []  # ID избранных шаблонов
    viewed_notifications: List[str] = []  # ID просмотренных оповещений
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    company_name: str  # Название компании (обязательно при регистрации)
    iin: str  # ИИН/БИН (обязательно при регистрации)
    legal_address: str  # Юридический адрес (обязательно при регистрации)
    language: str = "ru"

class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    iin: Optional[str] = None
    legal_address: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    language: str = "ru"

class ResetPassword(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str

class PasswordReset(BaseModel):
    """Password reset token"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    reset_code: str
    used: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=1))

class Registration(BaseModel):
    """Temporary registration data before phone verification"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    full_name: str
    phone: str
    company_name: str
    iin: str
    legal_address: str
    language: str = "ru"
    verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(minutes=30))

class ContractTemplate(BaseModel):
    """Шаблон договора для маркетплейса"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    title_kk: Optional[str] = None  # Название на казахском
    title_en: Optional[str] = None  # Название на английском
    description: str
    description_kk: Optional[str] = None
    description_en: Optional[str] = None
    category: str  # "real_estate", "services", "employment", "other"
    content: str  # Русский контент
    content_kk: Optional[str] = None  # Казахский контент
    content_en: Optional[str] = None  # Английский контент
    content_type: str = "plain"  # "plain" or "html"
    placeholders: Optional[dict] = None  # Конфигурация плейсхолдеров (с labels на 3 языках)
    requires_tenant_document: bool = False  # Требуется ли удостоверение нанимателя
    party_a_role: Optional[str] = 'Сторона А'  # Роль стороны А (русский)
    party_a_role_kk: Optional[str] = 'А жағы'  # Роль стороны А (казахский)
    party_a_role_en: Optional[str] = 'Party A'  # Роль стороны А (английский)
    party_b_role: Optional[str] = 'Сторона Б'  # Роль стороны Б (русский)
    party_b_role_kk: Optional[str] = 'Б жағы'  # Роль стороны Б (казахский)
    party_b_role_en: Optional[str] = 'Party B'  # Роль стороны Б (английский)
    is_active: bool = True
    created_by: str = "admin"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    content_kk: Optional[str] = None  # Казахская версия
    content_en: Optional[str] = None  # Английская версия
    content_type: str = "plain"  # "plain" or "html"
    creator_id: Optional[str] = None  # ИСПРАВЛЕНО: сделано опциональным для совместимости
    landlord_id: Optional[str] = None  # Добавлено для совместимости с existing data
    landlord_email: Optional[str] = None
    landlord_full_name: Optional[str] = None
    source_type: str = "manual"  # "manual", "template", "uploaded_pdf"
    template_id: Optional[str] = None  # ID шаблона, если создан из шаблона
    placeholder_values: Optional[dict] = None  # Значения placeholders {key: value}
    uploaded_pdf_path: Optional[str] = None  # Путь к загруженному PDF
    contract_number: Optional[str] = None  # Sequential number: 01, 02, 010, 0110, etc.
    contract_code: Optional[str] = None  # Unique short code: ABC-1234
    signer_name: str
    signer_phone: str
    signer_email: Optional[str] = None
    # Additional form fields for placeholder replacement
    move_in_date: Optional[str] = None
    move_out_date: Optional[str] = None
    property_address: Optional[str] = None
    rent_amount: Optional[str] = None
    days_count: Optional[str] = None
    status: str = "draft"  # draft, sent, pending-signature, signed, declined
    amount: Optional[str] = None
    file_data: Optional[str] = None  # base64 encoded file
    signature_link: Optional[str] = None
    landlord_signature_hash: Optional[str] = None  # Landlord's signature hash
    approved: bool = False  # Утвержден ли договор создателем
    approved_at: Optional[datetime] = None
    approved_content: Optional[str] = None  # Зафиксированный контент после утверждения
    approved_placeholder_values: Optional[dict] = None  # Зафиксированные значения плейсхолдеров
    landlord_name: Optional[str] = None  # Название компании
    landlord_email: Optional[str] = None  # Email наймодателя
    landlord_full_name: Optional[str] = None  # ФИО наймодателя
    landlord_phone: Optional[str] = None  # Телефон наймодателя
    landlord_address: Optional[str] = None  # Адрес наймодателя
    landlord_representative: Optional[str] = None  # Представитель (кто составил)
    landlord_iin_bin: Optional[str] = None  # ИИН/БИН из профиля
    verification_method: Optional[str] = None  # SMS, Call, Telegram
    telegram_username: Optional[str] = None  # @username для Telegram верификации
    signature: Optional[dict] = None  # Signature data (document_upload, verified status)
    tenant_document: Optional[str] = None  # Удостоверение нанимателя (base64 или путь)
    tenant_document_filename: Optional[str] = None  # Имя файла удостоверения
    party_a_role: Optional[str] = 'Сторона А'  # Роль стороны А (из шаблона)
    party_a_role_kk: Optional[str] = 'А жағы'
    party_a_role_en: Optional[str] = 'Party A'
    party_b_role: Optional[str] = 'Сторона Б'  # Роль стороны Б (из шаблона)
    party_b_role_kk: Optional[str] = 'Б жағы'
    party_b_role_en: Optional[str] = 'Party B'
    contract_language: Optional[str] = None  # ФИКСИРОВАННЫЙ язык договора (ru/kk/en), устанавливается один раз
    english_disclaimer_accepted: bool = False  # Подтверждение для английского
    deleted: bool = False  # Soft delete flag - для подписанных договоров
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContractCreate(BaseModel):
    title: str
    content: str
    content_kk: Optional[str] = None  # Казахская версия
    content_en: Optional[str] = None  # Английская версия
    content_type: str = "plain"  # "plain" or "html"
    template_id: Optional[str] = None  # ID шаблона, если создан из шаблона
    placeholder_values: Optional[dict] = None  # Значения placeholders {key: value}
    signer_name: Optional[str] = None  # Can be filled by signer
    signer_phone: Optional[str] = None  # Can be filled by signer
    signer_email: Optional[str] = None
    # Additional form fields
    move_in_date: Optional[str] = None
    move_out_date: Optional[str] = None
    property_address: Optional[str] = None
    rent_amount: Optional[str] = None
    days_count: Optional[str] = None
    amount: Optional[str] = None
    landlord_name: Optional[str] = None
    landlord_representative: Optional[str] = None
    party_a_role: Optional[str] = 'Сторона А'
    party_a_role_kk: Optional[str] = 'А жағы'
    party_a_role_en: Optional[str] = 'Party A'
    party_b_role: Optional[str] = 'Сторона Б'
    party_b_role_kk: Optional[str] = 'Б жағы'
    party_b_role_en: Optional[str] = 'Party B'

class Signature(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_id: str
    signer_phone: str
    verification_method: str  # sms, call
    otp_code: str
    document_upload: Optional[str] = None  # base64 encoded ID/passport
    document_filename: Optional[str] = None
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    verified: bool = False
    signature_hash: Optional[str] = None  # Unique signature hash/key
    signed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OTPVerify(BaseModel):
    contract_id: str
    phone: str
    otp_code: str

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_id: Optional[str] = None
    user_id: Optional[str] = None
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ===== HELPER FUNCTIONS =====
def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Notification models
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: str
    image_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationCreate(BaseModel):
    title: str
    message: str
    image_url: Optional[str] = None


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# ===== MULTILANGUAGE HELPERS =====
def get_content_by_language(obj: dict, field_base: str, language: str) -> str:
    """Get content in specified language with fallback to Russian"""
    if language == "kk" and obj.get(f"{field_base}_kk"):
        return obj[f"{field_base}_kk"]
    elif language == "en" and obj.get(f"{field_base}_en"):
        return obj[f"{field_base}_en"]
    return obj.get(field_base, "")

def get_role_by_language(obj: dict, role_field: str, language: str) -> str:
    """Get role name in specified language"""
    if language == "kk" and obj.get(f"{role_field}_kk"):
        return obj[f"{role_field}_kk"]
    elif language == "en" and obj.get(f"{role_field}_en"):
        return obj[f"{role_field}_en"]
    return obj.get(role_field, "Сторона")

def generate_otp() -> str:
    """Generate a 6-digit OTP code (mocked for fallback)"""
    return str(random.randint(100000, 999999))

def normalize_phone(phone: str) -> str:
    """Normalize phone number to international format"""
    # Remove spaces, dashes, and parentheses
    phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    # If starts with 8, replace with +7 (Kazakhstan/Russia)
    if phone.startswith('8'):
        phone = '+7' + phone[1:]
    # If starts with 77, add + (Kazakhstan mobile)
    elif phone.startswith('77') and not phone.startswith('+77'):
        phone = '+' + phone
    # If starts with 7 but not 77, assume it's missing the second 7
    elif phone.startswith('7') and not phone.startswith('77') and not phone.startswith('+7'):
        phone = '+7' + phone
    # If doesn't start with +, assume Kazakhstan and add +7
    elif not phone.startswith('+'):
        phone = '+7' + phone
    
    return phone

# ============ KAZINFOTECH SMS INTEGRATION ============

async def send_otp_via_kazinfotech(phone: str) -> dict:
    """Send OTP via KazInfoTech HTTP API
    
    Args:
        phone: Phone number (will be normalized to 7XXXXXXXXXX format)
    
    Returns:
        dict with 'success' bool, 'otp_code' and 'message' or 'error'
    """
    if not KAZINFOTECH_USERNAME or not KAZINFOTECH_PASSWORD:
        logging.error("KazInfoTech not configured")
        return {"success": False, "error": "SMS provider not configured"}
    
    try:
        # Normalize phone to 7XXXXXXXXXX format (no + or 8)
        normalized = normalize_phone(phone).replace('+', '')
        if normalized.startswith('8'):
            normalized = '7' + normalized[1:]
        
        # Generate 6-digit OTP
        otp_code = generate_otp()
        
        # Send SMS via HTTP API
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                KAZINFOTECH_API_URL,
                params={
                    "action": "sendmessage",
                    "username": KAZINFOTECH_USERNAME,
                    "password": KAZINFOTECH_PASSWORD,
                    "recipient": normalized,
                    "messagetype": "SMS:TEXT",
                    "originator": KAZINFOTECH_SENDER,
                    "messagedata": f"Ваш код для 2tick.kz: {otp_code}"
                }
            )
            
            if response.status_code == 200 and "<statuscode>0</statuscode>" in response.text:
                # Extract message ID from XML response
                import re
                message_id_match = re.search(r'<messageid>([^<]+)</messageid>', response.text)
                message_id = message_id_match.group(1) if message_id_match else None
                
                logging.info(f"✅ KazInfoTech OTP sent to {normalized}. Message ID: {message_id}")
                return {
                    "success": True,
                    "message": "OTP sent via KazInfoTech",
                    "otp_code": otp_code,  # Store OTP for verification
                    "message_id": message_id,
                    "phone": normalized
                }
            else:
                # Extract error message from XML
                import re
                error_match = re.search(r'<errormessage>([^<]+)</errormessage>', response.text)
                error_msg = error_match.group(1) if error_match else response.text
                logging.error(f"❌ KazInfoTech error: {error_msg}")
                return {"success": False, "error": error_msg}
                
    except Exception as e:
        logging.error(f"❌ KazInfoTech request error: {str(e)}")
        return {"success": False, "error": str(e)}


async def verify_otp_via_kazinfotech(stored_otp: str, entered_otp: str) -> dict:
    """Verify OTP by comparing stored and entered codes
    
    Args:
        stored_otp: OTP code that was sent
        entered_otp: OTP code entered by user
    
    Returns:
        dict with 'success' bool and 'status' or 'error'
    """
    if stored_otp and entered_otp and stored_otp == entered_otp:
        logging.info(f"✅ KazInfoTech OTP verified successfully")
        return {"success": True, "status": "approved"}
    else:
        logging.warning(f"❌ KazInfoTech OTP invalid: entered {entered_otp}, expected {stored_otp}")
        return {"success": False, "error": "Invalid PIN", "status": "rejected"}


async def send_sms_via_kazinfotech(phone: str, text: str) -> dict:
    """Send SMS via KazInfoTech HTTP API (for general messages)
    
    Args:
        phone: Phone number
        text: Message text
    
    Returns:
        dict with 'success' bool and 'message_id' or 'error'
    """
    if not KAZINFOTECH_LOGIN or not KAZINFOTECH_PASSWORD:
        logging.warning("KazInfoTech JSON API not configured")
        return {"success": False, "error": "KazInfoTech not configured"}
    
    if not KAZINFOTECH_USERNAME or not KAZINFOTECH_PASSWORD:
        logging.warning("KazInfoTech not configured for SMS")
        return {"success": False, "error": "KazInfoTech not configured"}
    
    try:
        # Normalize phone to 7XXXXXXXXXX format
        normalized = normalize_phone(phone).replace('+', '')
        if normalized.startswith('8'):
            normalized = '7' + normalized[1:]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                KAZINFOTECH_API_URL,
                params={
                    "action": "sendmessage",
                    "username": KAZINFOTECH_USERNAME,
                    "password": KAZINFOTECH_PASSWORD,
                    "recipient": normalized,
                    "messagetype": "SMS:TEXT",
                    "originator": KAZINFOTECH_SENDER,
                    "messagedata": text
                }
            )
            
            if response.status_code == 200 and "<statuscode>0</statuscode>" in response.text:
                import re
                message_id_match = re.search(r'<messageid>([^<]+)</messageid>', response.text)
                message_id = message_id_match.group(1) if message_id_match else None
                
                logging.info(f"✅ KazInfoTech SMS sent to {normalized}. Message ID: {message_id}")
                return {
                    "success": True,
                    "message_id": message_id,
                    "status": "sent"
                }
            else:
                logging.error(f"❌ KazInfoTech SMS error: {response.status_code} - {response.text}")
                return {"success": False, "error": f"SMS failed: {response.status_code}"}
                
    except Exception as e:
        logging.error(f"❌ KazInfoTech SMS error: {str(e)}")
        return {"success": False, "error": str(e)}


# ============ UNIFIED OTP FUNCTIONS ============

async def send_otp(phone: str) -> dict:
    """Send OTP using KazInfoTech (единственный SMS провайдер)
    
    Args:
        phone: Phone number
    
    Returns:
        dict with 'success' bool and provider-specific data
    """
    if KAZINFOTECH_USERNAME and KAZINFOTECH_PASSWORD:
        return await send_otp_via_kazinfotech(phone)
    else:
        # KazInfoTech not configured - return error
        logging.error("[SMS] KazInfoTech not configured - SMS cannot be sent")
        return {"success": False, "error": "SMS provider not configured"}


async def verify_otp(phone: str, code: str, stored_otp: str = None) -> dict:
    """Verify OTP using stored code (KazInfoTech local verification)
    
    Args:
        phone: Phone number
        code: OTP code entered by user
        stored_otp: OTP code that was sent
    
    Returns:
        dict with 'success' bool and 'status' or 'error'
    """
    if stored_otp:
        return await verify_otp_via_kazinfotech(stored_otp, code)
    else:
        # No stored OTP - return error
        logging.error("[SMS] No stored OTP for verification")
        return {"success": False, "error": "OTP not found"}


# ============ EMAIL OTP FUNCTIONS ============

# Logo URL for emails (hosted publicly)
EMAIL_LOGO_URL = "https://customer-assets.emergentagent.com/job_6b787c47-7870-4c48-a923-10b09f887e22/artifacts/xqk86zjh_Bot%20Avatar%20512x512.png"

async def send_otp_via_email(email: str) -> dict:
    """Send OTP via Email
    
    Args:
        email: Email address
    
    Returns:
        dict with 'success' bool, 'otp_code' and 'message' or 'error'
    """
    try:
        # Generate 6-digit OTP
        otp_code = generate_otp()
        
        # Clean professional email design with blue theme
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f0f9ff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(37, 99, 235, 0.15);">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                            <img src="{EMAIL_LOGO_URL}" alt="2tick.kz" width="60" height="60" style="border-radius: 14px;">
                            <h1 style="color: #ffffff; margin: 18px 0 5px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Подтверждение действия</h1>
                            <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 14px;">Система электронного подписания договоров</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 45px 40px;">
                            <p style="margin: 0 0 10px 0; font-size: 16px; color: #1e293b; font-weight: 600;">
                                Здравствуйте!
                            </p>
                            <p style="margin: 0 0 30px 0; font-size: 15px; color: #64748b; line-height: 1.6;">
                                Вы запросили код подтверждения для входа или подписания договора на платформе 2tick.kz
                            </p>
                            
                            <!-- OTP Code Box -->
                            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 16px; padding: 28px 40px; text-align: center; border: 1px solid #bfdbfe;">
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">Ваш код подтверждения</p>
                                <span style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #1d4ed8; font-family: 'SF Mono', 'Courier New', monospace;">{otp_code}</span>
                            </div>
                            
                            <!-- Security notice -->
                            <div style="background: #f8fafc; border-radius: 12px; padding: 18px 20px; margin-top: 25px;">
                                <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; font-weight: 600;">
                                    Важная информация о безопасности:
                                </p>
                                <ul style="margin: 0; padding-left: 18px; color: #64748b; font-size: 13px; line-height: 1.8;">
                                    <li>Никогда не сообщайте этот код третьим лицам</li>
                                    <li>Сотрудники 2tick.kz никогда не запрашивают код</li>
                                    <li>Если вы не запрашивали код — проигнорируйте это письмо</li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #1e293b; padding: 25px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 15px; color: #ffffff; font-weight: 600;">
                                2tick.kz
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                Надежная платформа для электронного подписания договоров
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
        
        # Send email in background for faster response
        send_email_async(
            to_email=email,
            subject=f"Код: {otp_code} — 2tick.kz",
            body=html_body
        )
        
        logging.info(f"⚡ Email OTP queued for {email}")
        return {
            "success": True,
            "message": "OTP sent via Email",
            "otp_code": otp_code,
            "email": email
        }
            
    except Exception as e:
        logging.error(f"❌ Email OTP error: {str(e)}")
        return {"success": False, "error": str(e)}


async def verify_otp_via_email(stored_otp: str, entered_otp: str) -> dict:
    """Verify Email OTP by comparing stored and entered codes
    
    Args:
        stored_otp: OTP code that was sent
        entered_otp: OTP code entered by user
    
    Returns:
        dict with 'success' bool and 'status' or 'error'
    """
    if stored_otp and entered_otp and stored_otp == entered_otp:
        logging.info(f"✅ Email OTP verified successfully")
        return {"success": True, "status": "approved"}
    else:
        logging.warning(f"❌ Email OTP invalid: entered {entered_otp}, expected {stored_otp}")
        return {"success": False, "error": "Invalid code", "status": "rejected"}


def send_sms(phone: str, message: str) -> bool:
    """Legacy mocked SMS sending (kept for backward compatibility)"""
    logging.info(f"[MOCK SMS] To: {phone} | Message: {message}")
    return True

# Threading for background email sending
import threading
from queue import Queue

email_queue = Queue()

def _send_email_worker(to_email: str, subject: str, body: str, attachment: bytes = None, filename: str = None):
    """Worker function that actually sends email in background thread"""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.application import MIMEApplication
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html', 'utf-8'))
        
        if attachment and filename:
            pdf_attachment = MIMEApplication(attachment, _subtype='pdf')
            pdf_attachment.add_header('Content-Disposition', 'attachment', filename=filename)
            msg.attach(pdf_attachment)
            print(f"📎 [BG] PDF attached: {filename} ({len(attachment)} bytes)")
        
        server = smtplib.SMTP(SMTP_HOST, 587, timeout=60)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ [BG] Email sent to {to_email}")
        logging.info(f"✅ [BG] Email sent to {to_email}")
    except Exception as e:
        print(f"❌ [BG] Email error: {e}")
        logging.error(f"❌ [BG] Email error to {to_email}: {e}")

def send_email_async(to_email: str, subject: str, body: str, attachment: bytes = None, filename: str = None):
    """Send email in background thread - returns immediately"""
    print(f"⚡ Queuing email to {to_email} (background)")
    thread = threading.Thread(
        target=_send_email_worker,
        args=(to_email, subject, body, attachment, filename),
        daemon=False  # Non-daemon to ensure email is sent even after request completes
    )
    thread.start()
    return True

def send_email(to_email: str, subject: str, body: str, attachment: bytes = None, filename: str = None) -> bool:
    """Send email via SMTP only"""
    print(f"🔥 DEBUG send_email: to={to_email}, USE_SMTP={USE_SMTP}")
    logging.info(f"📧 Attempting to send email to {to_email}, subject: {subject}")
    
    # Try SMTP first if enabled
    if USE_SMTP and SMTP_HOST and SMTP_PASSWORD:
        print(f"🔥 DEBUG: Using SMTP mode - {SMTP_HOST}:{SMTP_PORT}")
        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            from email.mime.application import MIMEApplication
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = SENDER_EMAIL
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Attach HTML body
            msg.attach(MIMEText(body, 'html', 'utf-8'))
            
            # Attach PDF if provided
            if attachment and filename:
                pdf_attachment = MIMEApplication(attachment, _subtype='pdf')
                pdf_attachment.add_header('Content-Disposition', 'attachment', filename=filename)
                msg.attach(pdf_attachment)
                print(f"📎 PDF attached: {filename} ({len(attachment)} bytes)")
            
            # Try different ports and methods with reduced timeout for faster failure
            smtp_sent = False
            errors = []
            
            # Try port 587 with STARTTLS first (most reliable), then configured SMTP_PORT
            # Removed port 465 to reduce total timeout
            for port, use_tls in [(587, True), (SMTP_PORT, False)]:
                try:
                    print(f"🔥 Trying SMTP port {port}, TLS={use_tls}")
                    
                    # Increased timeout for large attachments
                    if use_tls == 'SSL':
                        # SSL connection (port 465)
                        import ssl
                        context = ssl.create_default_context()
                        server = smtplib.SMTP_SSL(SMTP_HOST, port, context=context, timeout=60)
                    else:
                        # Regular connection
                        server = smtplib.SMTP(SMTP_HOST, port, timeout=60)
                        server.ehlo()
                        
                        if use_tls:
                            # STARTTLS (port 587)
                            server.starttls()
                            server.ehlo()
                    
                    # Login and send
                    server.login(SMTP_USER, SMTP_PASSWORD)
                    server.send_message(msg)
                    server.quit()
                    
                    print(f"✅ SMTP email sent successfully via port {port}!")
                    logging.info(f"✅ SMTP email sent to {to_email}")
                    smtp_sent = True
                    break
                    
                except Exception as e:
                    error_msg = f"Port {port}: {str(e)}"
                    errors.append(error_msg)
                    print(f"❌ {error_msg}")
                    continue
            
            if smtp_sent:
                return True
            else:
                print(f"❌ All SMTP ports failed: {errors}")
                logging.error(f"SMTP failed on all ports: {errors}")
                return False
                
        except Exception as e:
            print(f"❌ SMTP error: {str(e)}")
            logging.error(f"SMTP error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return False
    
    # SMTP not configured
    logging.error("❌ SMTP not configured - email cannot be sent")
    return False

def html_to_text_for_pdf(html_content: str) -> str:
    """Convert HTML content to text while preserving basic formatting"""
    import re
    
    # Replace <br> and </p> with newlines
    text = html_content.replace('<br>', '\n').replace('<br/>', '\n').replace('<br />', '\n')
    text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</div>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</h[1-6]>', '\n', text, flags=re.IGNORECASE)
    
    # Remove all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Decode HTML entities
    import html
    text = html.unescape(text)
    
    # Clean up multiple newlines (keep max 2)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()

def _draw_simple_header(p, width, height, contract_code, logo_path='/app/logo.png', qr_data=None):
    """Draw header with logo and QR code (no page numbers - those are added later)"""
    from reportlab.lib.colors import HexColor
    from reportlab.lib.utils import ImageReader
    
    # ===== HEADER =====
    # Logo
    if os.path.exists(logo_path):
        try:
            img_reader = ImageReader(logo_path)
            p.drawImage(img_reader, 40, height - 50, width=40, height=40, mask='auto')
        except Exception as e:
            logging.error(f"Error loading logo: {str(e)}")
    
    # Company name
    try:
        p.setFont("DejaVu-Bold", 14)
    except:
        p.setFont("Helvetica-Bold", 14)
    
    p.setFillColor(HexColor('#3b82f6'))
    p.drawString(90, height - 30, "2tick.kz")
    
    try:
        p.setFont("DejaVu", 8)
    except:
        p.setFont("Helvetica", 8)
    p.setFillColor(HexColor('#64748b'))
    p.drawString(90, height - 42, "Электронная подпись договоров")
    
    # Contract code on right
    p.setFillColor(HexColor('#64748b'))
    p.drawRightString(width - 40, height - 30, f"№ {contract_code}")
    p.drawRightString(width - 40, height - 42, datetime.now().strftime('%d.%m.%Y'))
    
    # ===== QR CODE (top right corner) =====
    if qr_data:
        try:
            import qrcode
            from io import BytesIO
            
            qr = qrcode.QRCode(version=1, box_size=3, border=1)
            qr.add_data(qr_data)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            
            # Save to bytes
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)
            
            # Draw QR code
            qr_reader = ImageReader(qr_buffer)
            p.drawImage(qr_reader, width - 100, height - 100, width=50, height=50)
            
            # QR label
            try:
                p.setFont("DejaVu", 6)
            except:
                p.setFont("Helvetica", 6)
            p.setFillColor(HexColor('#94a3b8'))
            p.drawCentredString(width - 75, height - 105, "Проверить")
        except Exception as e:
            logging.error(f"Error creating QR code: {str(e)}")
    
    # Reset color
    p.setFillColor(HexColor('#000000'))

def draw_page_header_footer(p, width, height, page_num, total_pages, contract_code, logo_path='/app/logo.png', qr_data=None):
    """Draw header with logo, footer with page number, and QR code on every page"""
    from reportlab.lib.colors import HexColor
    from reportlab.lib.utils import ImageReader
    
    # ===== HEADER =====
    # Logo
    if os.path.exists(logo_path):
        try:
            img_reader = ImageReader(logo_path)
            p.drawImage(img_reader, 40, height - 50, width=40, height=40, mask='auto')
        except Exception as e:
            logging.error(f"Error loading logo: {str(e)}")
    
    # Company name
    try:
        p.setFont("DejaVu-Bold", 14)
    except:
        p.setFont("Helvetica-Bold", 14)
    
    p.setFillColor(HexColor('#3b82f6'))
    p.drawString(90, height - 30, "2tick.kz")
    
    try:
        p.setFont("DejaVu", 8)
    except:
        p.setFont("Helvetica", 8)
    p.setFillColor(HexColor('#64748b'))
    p.drawString(90, height - 42, "Электронная подпись договоров")
    
    # Contract code on right
    p.setFillColor(HexColor('#64748b'))
    p.drawRightString(width - 40, height - 30, f"№ {contract_code}")
    p.drawRightString(width - 40, height - 42, datetime.now().strftime('%d.%m.%Y'))
    
    # ===== QR CODE (top right corner) =====
    if qr_data:
        try:
            import qrcode
            from io import BytesIO
            
            qr = qrcode.QRCode(version=1, box_size=3, border=1)
            qr.add_data(qr_data)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            
            # Save to bytes
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)
            
            # Draw QR code
            from reportlab.lib.utils import ImageReader
            qr_reader = ImageReader(qr_buffer)
            p.drawImage(qr_reader, width - 100, height - 100, width=50, height=50)
            
            # QR label
            try:
                p.setFont("DejaVu", 6)
            except:
                p.setFont("Helvetica", 6)
            p.setFillColor(HexColor('#94a3b8'))
            p.drawCentredString(width - 75, height - 105, "Проверить")
        except Exception as e:
            logging.error(f"Error creating QR code: {str(e)}")
    
    # ===== FOOTER =====
    try:
        p.setFont("DejaVu", 8)
    except:
        p.setFont("Helvetica", 8)
    p.setFillColor(HexColor('#94a3b8'))
    p.drawCentredString(width / 2, 25, f"Страница {page_num} из {total_pages}")
    p.drawString(40, 25, "2tick.kz — Электронная подпись договоров")
    p.drawRightString(width - 40, 25, f"№ {contract_code}")
    
    # Reset color
    p.setFillColor(HexColor('#000000'))


def draw_signature_block(p, y_position, width, height, contract, signature, landlord, template, language='ru'):
    """Draw modern signature information block matching website design"""
    from reportlab.lib.colors import HexColor
    
    # Translations - matching ContractDetailsPage
    translations = {
        'ru': {
            'title': 'Информация о подписании',
            'code_key': 'Код-ключ',
            'name': 'Имя',
            'address': 'Адрес',
            'phone': 'Номер телефона',
            'email': 'Почта',
            'iin': 'ИИН',
            'status': 'Статус',
            'approved': 'Утверждено',
            'approval_time': 'Время утверждения',
            'signing_time': 'Время подписания',
            'contract_language': 'Язык договора',
            'signing_method': 'Метод подписания',
            'telegram': 'Telegram',
            'sms': 'SMS',
            'call': 'Входящий звонок',
            'awaiting': 'Ожидает утверждения',
            'russian': 'Русский',
            'kazakh': 'Қазақша',
            'english': 'English',
        },
        'kk': {
            'title': 'Қол қою туралы ақпарат',
            'code_key': 'Код-кілт',
            'name': 'Аты',
            'address': 'Мекенжай',
            'phone': 'Телефон нөмірі',
            'email': 'Пошта',
            'iin': 'ЖСН',
            'status': 'Мәртебесі',
            'approved': 'Бекітілді',
            'approval_time': 'Бекіту уақыты',
            'signing_time': 'Қол қою уақыты',
            'contract_language': 'Шарт тілі',
            'signing_method': 'Қол қою әдісі',
            'telegram': 'Telegram',
            'sms': 'SMS',
            'call': 'Кіріс қоңырау',
            'awaiting': 'Бекітуді күтуде',
            'russian': 'Орысша',
            'kazakh': 'Қазақша',
            'english': 'English',
        },
        'en': {
            'title': 'Signature Information',
            'code_key': 'Code-key',
            'name': 'Name',
            'address': 'Address',
            'phone': 'Phone number',
            'email': 'Email',
            'iin': 'IIN',
            'status': 'Status',
            'approved': 'Approved',
            'approval_time': 'Approval time',
            'signing_time': 'Signing time',
            'contract_language': 'Contract language',
            'signing_method': 'Signing method',
            'telegram': 'Telegram',
            'sms': 'SMS',
            'call': 'Incoming call',
            'awaiting': 'Awaiting approval',
            'russian': 'Russian',
            'kazakh': 'Kazakh',
            'english': 'English',
        }
    }
    
    t = translations.get(language, translations['ru'])
    
    # Check if we need new page - need more space for modern design
    if y_position < 350:
        p.showPage()
        y_position = height - 80
    
    y_position -= 30
    
    # Modern title with emoji style
    try:
        p.setFont("DejaVu-Bold", 14)
    except:
        p.setFont("Helvetica-Bold", 14)
    
    p.setFillColor(HexColor('#1f2937'))  # Dark gray like website
    p.drawString(55, y_position, t['title'])
    
    y_position -= 25
    
    # Draw two card-style columns
    left_col_x = 55
    right_col_x = width / 2 + 10
    col_width = (width - 110) / 2 - 10
    
    # Get party roles
    party_a_role = contract.get(f'party_a_role_{language}') or contract.get('party_a_role') or 'Сторона А'
    party_b_role = contract.get(f'party_b_role_{language}') or contract.get('party_b_role') or 'Сторона Б'
    
    # ========== LEFT COLUMN - Party A (Landlord) ==========
    card_start_y = y_position
    
    # Card header with icon
    try:
        p.setFont("DejaVu-Bold", 11)
    except:
        p.setFont("Helvetica-Bold", 11)
    p.setFillColor(HexColor('#1f2937'))
    p.drawString(left_col_x, y_position, party_a_role)
    
    y_position -= 20
    
    # Landlord signature hash box (green background style)
    landlord_hash = contract.get('landlord_signature_hash', '')
    if landlord_hash:
        # Draw green background box
        p.setFillColor(HexColor('#ecfdf5'))  # Light green
        p.roundRect(left_col_x, y_position - 25, col_width, 35, 4, fill=1, stroke=0)
        
        # Border
        p.setStrokeColor(HexColor('#a7f3d0'))  # Green border
        p.setLineWidth(1)
        p.roundRect(left_col_x, y_position - 25, col_width, 35, 4, fill=0, stroke=1)
        
        try:
            p.setFont("DejaVu", 8)
        except:
            p.setFont("Helvetica", 8)
        p.setFillColor(HexColor('#047857'))  # Dark green text
        p.drawString(left_col_x + 8, y_position - 5, f"{t['code_key']}:")
        
        try:
            p.setFont("DejaVu-Bold", 10)
        except:
            p.setFont("Helvetica-Bold", 10)
        p.setFillColor(HexColor('#064e3b'))  # Darker green
        p.drawString(left_col_x + 8, y_position - 18, landlord_hash)
        
        y_position -= 35
    
    y_position -= 10
    
    # Landlord details - from template placeholders or fallback
    try:
        p.setFont("DejaVu", 9)
    except:
        p.setFont("Helvetica", 9)
    
    placeholder_values = contract.get('placeholder_values', {})
    
    # Get landlord data from template placeholders if available
    if template and template.get('placeholders'):
        for key, config in template['placeholders'].items():
            if config.get('type') == 'calculated':
                continue
            if config.get('showInSignatureInfo') == False:
                continue
            if config.get('owner') != 'landlord':
                continue
            
            value = placeholder_values.get(key, '')
            label = config.get('label', key)
            
            if value:
                p.setFillColor(HexColor('#6b7280'))  # Gray label
                p.drawString(left_col_x, y_position, f"{label}:")
                y_position -= 12
                p.setFillColor(HexColor('#1f2937'))  # Dark value
                p.drawString(left_col_x, y_position, str(value)[:40])
                y_position -= 15
    else:
        # Fallback - use placeholder_values or landlord data
        # Name from placeholder_values (1NAME) or landlord
        landlord_name = placeholder_values.get('1NAME', '')
        if not landlord_name and landlord:
            landlord_name = landlord.get('company_name') or landlord.get('full_name', '')
        
        if landlord_name:
            p.setFillColor(HexColor('#6b7280'))
            p.drawString(left_col_x, y_position, f"{t['name']}:")
            y_position -= 12
            p.setFillColor(HexColor('#1f2937'))
            p.drawString(left_col_x, y_position, landlord_name[:40])
            y_position -= 15
        
        # Address from placeholder_values
        address = placeholder_values.get('ADDRESS', '')
        if address:
            p.setFillColor(HexColor('#6b7280'))
            p.drawString(left_col_x, y_position, f"{t['address']}:")
            y_position -= 12
            p.setFillColor(HexColor('#1f2937'))
            p.drawString(left_col_x, y_position, address[:40])
            y_position -= 15
        
        if landlord:
            if landlord.get('phone'):
                p.setFillColor(HexColor('#6b7280'))
                p.drawString(left_col_x, y_position, f"{t['phone']}:")
                y_position -= 12
                p.setFillColor(HexColor('#1f2937'))
                p.drawString(left_col_x, y_position, landlord.get('phone', ''))
                y_position -= 15
            
            if landlord.get('email'):
                p.setFillColor(HexColor('#6b7280'))
                p.drawString(left_col_x, y_position, f"{t['email']}:")
                y_position -= 12
                p.setFillColor(HexColor('#1f2937'))
                p.drawString(left_col_x, y_position, landlord.get('email', '')[:35])
                y_position -= 15
    
    # Status and approval time
    p.setFillColor(HexColor('#6b7280'))
    p.drawString(left_col_x, y_position, f"{t['status']}:")
    y_position -= 12
    if landlord_hash:
        p.setFillColor(HexColor('#059669'))  # Green
        p.drawString(left_col_x, y_position, t['approved'])
    else:
        p.setFillColor(HexColor('#d97706'))  # Amber
        p.drawString(left_col_x, y_position, t['awaiting'])
    y_position -= 15
    
    # Approval time
    approved_at = contract.get('approved_at', '')
    if approved_at:
        p.setFillColor(HexColor('#6b7280'))
        p.drawString(left_col_x, y_position, f"{t['approval_time']}:")
        y_position -= 12
        p.setFillColor(HexColor('#1f2937'))
        try:
            if isinstance(approved_at, str):
                approved_dt = datetime.fromisoformat(approved_at.replace('Z', '+00:00'))
            else:
                approved_dt = approved_at
            p.drawString(left_col_x, y_position, approved_dt.strftime('%d %b %Y %H:%M'))
        except:
            p.drawString(left_col_x, y_position, str(approved_at)[:20])
        y_position -= 15
    
    # Contract language
    contract_lang = contract.get('contract_language') or contract.get('signing_language', 'ru')
    p.setFillColor(HexColor('#6b7280'))
    p.drawString(left_col_x, y_position, f"{t['contract_language']}:")
    y_position -= 12
    p.setFillColor(HexColor('#1f2937'))
    lang_display = {'ru': t['russian'], 'kk': t['kazakh'], 'en': t['english']}.get(contract_lang, contract_lang)
    p.drawString(left_col_x, y_position, lang_display)
    
    left_col_end_y = y_position - 15
    
    # ========== RIGHT COLUMN - Party B (Tenant/Signer) ==========
    y_position = card_start_y
    
    # Card header with icon
    try:
        p.setFont("DejaVu-Bold", 11)
    except:
        p.setFont("Helvetica-Bold", 11)
    p.setFillColor(HexColor('#1f2937'))
    p.drawString(right_col_x, y_position, party_b_role)
    
    y_position -= 20
    
    # Tenant signature hash box (blue background style)
    tenant_hash = signature.get('signature_hash', '') if signature else ''
    if tenant_hash:
        # Draw blue background box
        p.setFillColor(HexColor('#eff6ff'))  # Light blue
        p.roundRect(right_col_x, y_position - 25, col_width, 35, 4, fill=1, stroke=0)
        
        # Border
        p.setStrokeColor(HexColor('#bfdbfe'))  # Blue border
        p.setLineWidth(1)
        p.roundRect(right_col_x, y_position - 25, col_width, 35, 4, fill=0, stroke=1)
        
        try:
            p.setFont("DejaVu", 8)
        except:
            p.setFont("Helvetica", 8)
        p.setFillColor(HexColor('#1d4ed8'))  # Dark blue text
        p.drawString(right_col_x + 8, y_position - 5, f"{t['code_key']}:")
        
        try:
            p.setFont("DejaVu-Bold", 10)
        except:
            p.setFont("Helvetica-Bold", 10)
        p.setFillColor(HexColor('#1e3a8a'))  # Darker blue
        p.drawString(right_col_x + 8, y_position - 18, tenant_hash)
        
        y_position -= 35
    
    y_position -= 10
    
    # Tenant details - from template placeholders or fallback
    try:
        p.setFont("DejaVu", 9)
    except:
        p.setFont("Helvetica", 9)
    
    if template and template.get('placeholders'):
        for key, config in template['placeholders'].items():
            if config.get('type') == 'calculated':
                continue
            if config.get('showInSignatureInfo') == False:
                continue
            if config.get('owner') not in ['tenant', 'signer']:
                continue
            
            value = placeholder_values.get(key, '')
            label = config.get('label', key)
            
            if value:
                p.setFillColor(HexColor('#6b7280'))
                p.drawString(right_col_x, y_position, f"{label}:")
                y_position -= 12
                p.setFillColor(HexColor('#1f2937'))
                p.drawString(right_col_x, y_position, str(value)[:40])
                y_position -= 15
    else:
        # Fallback to placeholder_values or old fields
        # Try to get name from placeholder_values
        signer_name = placeholder_values.get('NAME2', '') or contract.get('signer_name', '')
        if signer_name:
            p.setFillColor(HexColor('#6b7280'))
            p.drawString(right_col_x, y_position, f"{t['name']}:")
            y_position -= 12
            p.setFillColor(HexColor('#1f2937'))
            p.drawString(right_col_x, y_position, signer_name[:40])
            y_position -= 15
        
        # Phone from placeholder_values or contract
        signer_phone = placeholder_values.get('PHONE_NUM', '') or contract.get('signer_phone', '')
        if signer_phone:
            p.setFillColor(HexColor('#6b7280'))
            p.drawString(right_col_x, y_position, f"{t['phone']}:")
            y_position -= 12
            p.setFillColor(HexColor('#1f2937'))
            p.drawString(right_col_x, y_position, signer_phone)
            y_position -= 15
        
        # IIN from placeholder_values
        signer_iin = placeholder_values.get('ID_CARD', '') or placeholder_values.get('IIN', '')
        if signer_iin:
            p.setFillColor(HexColor('#6b7280'))
            p.drawString(right_col_x, y_position, f"{t['iin']}:")
            y_position -= 12
            p.setFillColor(HexColor('#1f2937'))
            p.drawString(right_col_x, y_position, signer_iin)
            y_position -= 15
        
        # Email from placeholder_values or contract
        signer_email = placeholder_values.get('EMAIL', '') or contract.get('signer_email', '')
        if signer_email:
            p.setFillColor(HexColor('#6b7280'))
            p.drawString(right_col_x, y_position, f"{t['email']}:")
            y_position -= 12
            p.setFillColor(HexColor('#1f2937'))
            p.drawString(right_col_x, y_position, signer_email[:35])
            y_position -= 15
    
    # Verification method
    verification_method = contract.get('verification_method', '')
    if verification_method:
        p.setFillColor(HexColor('#6b7280'))
        p.drawString(right_col_x, y_position, f"{t['signing_method']}:")
        y_position -= 12
        p.setFillColor(HexColor('#1f2937'))
        method_display = {
            'sms': t['sms'],
            'call': t['call'],
            'telegram': t['telegram']
        }.get(verification_method, verification_method)
        p.drawString(right_col_x, y_position, method_display)
        y_position -= 15
    
    # Telegram username
    telegram_username = contract.get('telegram_username', '')
    if verification_method == 'telegram' and telegram_username:
        p.setFillColor(HexColor('#6b7280'))
        p.drawString(right_col_x, y_position, "Telegram:")
        y_position -= 12
        p.setFillColor(HexColor('#1f2937'))
        p.drawString(right_col_x, y_position, f"@{telegram_username}")
        y_position -= 15
    
    # Signing time
    signed_at = signature.get('signed_at', '') if signature else ''
    if signed_at:
        p.setFillColor(HexColor('#6b7280'))
        p.drawString(right_col_x, y_position, f"{t['signing_time']}:")
        y_position -= 12
        p.setFillColor(HexColor('#1f2937'))
        try:
            if isinstance(signed_at, str):
                signed_dt = datetime.fromisoformat(signed_at.replace('Z', '+00:00'))
            else:
                signed_dt = signed_at
            p.drawString(right_col_x, y_position, signed_dt.strftime('%d %b %Y %H:%M'))
        except:
            p.drawString(right_col_x, y_position, str(signed_at)[:20])
        y_position -= 15
    
    # Contract language for tenant too
    p.setFillColor(HexColor('#6b7280'))
    p.drawString(right_col_x, y_position, f"{t['contract_language']}:")
    y_position -= 12
    p.setFillColor(HexColor('#1f2937'))
    p.drawString(right_col_x, y_position, lang_display)
    
    right_col_end_y = y_position - 15
    
    # Return the lowest y position
    p.setFillColor(HexColor('#000000'))
    return min(left_col_end_y, right_col_end_y) - 20


def draw_content_section(p, content_text, y_position, width, height, language_label=None, is_translation=False, start_new_page=False, page_info=None):
    """Helper function to draw a content section in PDF
    
    Args:
        start_new_page: If True, starts content on a new page
        page_info: Dict with 'current_page', 'contract_code', 'logo_path', 'qr_data' for proper headers
    """
    from reportlab.lib.colors import HexColor
    
    left_margin = 55
    right_margin = width - 55
    usable_width = right_margin - left_margin  # ~485 points for A4
    
    # Start new page if requested
    if start_new_page:
        p.showPage()
        y_position = height - 120  # Leave space for header
        if page_info:
            page_info['current_page'] += 1
    
    # Add language header if provided
    if language_label:
        try:
            p.setFont("DejaVu-Bold", 14)
        except:
            p.setFont("Helvetica-Bold", 14)
        
        if is_translation:
            p.setFillColor(HexColor('#94a3b8'))  # Gray for translation notice
            header_text = f"═══ {language_label} ═══"
            p.drawCentredString(width / 2, y_position, header_text)
            y_position -= 20
            try:
                p.setFont("DejaVu", 9)
            except:
                p.setFont("Helvetica", 9)
            p.drawCentredString(width / 2, y_position, "(перевод, юридической силы не имеет / translation, no legal force)")
        else:
            p.setFillColor(HexColor('#1e40af'))  # Blue for official languages
            header_text = f"═══ {language_label} ═══"
            p.drawCentredString(width / 2, y_position, header_text)
        
        p.setFillColor(HexColor('#000000'))
        y_position -= 35
    
    # Set content font
    font_name = "DejaVu"
    font_size = 10
    try:
        p.setFont(font_name, font_size)
    except:
        font_name = "Helvetica"
        p.setFont(font_name, font_size)
    
    lines = content_text.split('\n')
    
    def get_text_width(text, font, size):
        """Calculate text width in points"""
        try:
            return p.stringWidth(text, font, size)
        except:
            # Fallback: estimate width (average 6 points per char for 10pt font)
            return len(text) * 6
    
    def wrap_line_by_width(line, max_width, font, size):
        """Wrap line by actual pixel width, not character count"""
        if not line.strip():
            return ['']
        
        words = line.split()
        wrapped_lines = []
        current_line = ""
        
        for word in words:
            test_line = current_line + (" " if current_line else "") + word
            test_width = get_text_width(test_line, font, size)
            
            if test_width <= max_width:
                current_line = test_line
            else:
                # Current line is full, save it
                if current_line:
                    wrapped_lines.append(current_line)
                
                # Check if word itself is too long
                word_width = get_text_width(word, font, size)
                if word_width > max_width:
                    # Break long word
                    chars = ""
                    for char in word:
                        test_chars = chars + char
                        if get_text_width(test_chars, font, size) <= max_width:
                            chars = test_chars
                        else:
                            if chars:
                                wrapped_lines.append(chars)
                            chars = char
                    current_line = chars
                else:
                    current_line = word
        
        if current_line:
            wrapped_lines.append(current_line)
        
        return wrapped_lines if wrapped_lines else ['']
    
    for line in lines:
        # Check for page break
        if y_position < 120:
            p.showPage()
            if page_info:
                page_info['current_page'] += 1
            try:
                p.setFont(font_name, font_size)
            except:
                p.setFont("Helvetica", font_size)
            p.setFillColor(HexColor('#000000'))
            y_position = height - 120
        
        # Wrap line by actual width
        wrapped = wrap_line_by_width(line, usable_width, font_name, font_size)
        
        for wrapped_line in wrapped:
            if y_position < 120:
                p.showPage()
                if page_info:
                    page_info['current_page'] += 1
                try:
                    p.setFont(font_name, font_size)
                except:
                    p.setFont("Helvetica", font_size)
                p.setFillColor(HexColor('#000000'))
                y_position = height - 120
            
            if wrapped_line.strip():
                p.drawString(left_margin, y_position, wrapped_line.strip())
                y_position -= 14
            else:
                y_position -= 7
    
    return y_position

def generate_contract_pdf(contract: dict, signature: dict = None, landlord_signature_hash: str = None, landlord: dict = None, template: dict = None) -> bytes:
    """Generate full PDF for contract with all content and signatures
    
    PDF Structure:
    - Pages 1+: Russian version + signature block (RU) - may span multiple pages
    - Pages N+: Kazakh version + signature block (KK) - may span multiple pages
    - Pages M+ (if EN selected): English version + signature block (EN)
    - Last page: ID document photo (if available)
    
    Features:
    - QR code on every page
    - Dynamic page numbers (calculated after content is rendered)
    - Header with logo
    - Footer with contract info
    """
    
    # Get FIXED contract language (not UI language)
    selected_language = contract.get('contract_language') or contract.get('signing_language', 'ru')
    logging.info(f"📄 Generating bilingual PDF. User selected: {selected_language}")
    
    # Determine which languages to include
    include_english = (selected_language == 'en')
    
    # Register fonts - try multiple locations
    font_registered = False
    font_paths = [
        '/usr/share/fonts/truetype/dejavu/',
        '/usr/share/fonts/truetype/freefont/',
        '/usr/share/fonts/',
        '/app/backend/fonts/',
        '/app/backend/',
    ]
    
    for dejavu_path in font_paths:
        try:
            if os.path.exists(dejavu_path + 'DejaVuSans.ttf'):
                pdfmetrics.registerFont(TTFont('DejaVu', dejavu_path + 'DejaVuSans.ttf'))
                pdfmetrics.registerFont(TTFont('DejaVu-Bold', dejavu_path + 'DejaVuSans-Bold.ttf'))
                pdfmetrics.registerFont(TTFont('DejaVu-Mono', dejavu_path + 'DejaVuSansMono.ttf'))
                font_registered = True
                logging.info(f"✅ PDF fonts registered from: {dejavu_path}")
                break
            elif os.path.exists(dejavu_path + 'FreeSans.ttf'):
                pdfmetrics.registerFont(TTFont('DejaVu', dejavu_path + 'FreeSans.ttf'))
                pdfmetrics.registerFont(TTFont('DejaVu-Bold', dejavu_path + 'FreeSansBold.ttf'))
                pdfmetrics.registerFont(TTFont('DejaVu-Mono', dejavu_path + 'FreeMono.ttf'))
                font_registered = True
                logging.info(f"✅ PDF fonts registered from FreeFonts: {dejavu_path}")
                break
        except Exception as e:
            logging.warning(f"Failed to register fonts from {dejavu_path}: {str(e)}")
            continue
    
    if not font_registered:
        logging.warning("⚠️ No TTF fonts found, using Helvetica fallback (may have encoding issues)")
    
    # Create PDF
    pdf_buffer = BytesIO()
    p = canvas.Canvas(pdf_buffer, pagesize=A4)
    width, height = A4
    
    from reportlab.lib.colors import HexColor
    
    contract_code = contract.get('contract_code', 'N/A')
    logo_path = '/app/logo.png'
    
    # QR code data - link to verify contract on production domain
    qr_data = f"https://2tick.kz/verify/{contract.get('id', '')}"
    
    # Track page info for dynamic numbering
    page_info = {
        'current_page': 1,
        'contract_code': contract_code,
        'logo_path': logo_path,
        'qr_data': qr_data
    }
    
    # ========== FIRST PASS: Generate content without page numbers ==========
    # We'll add headers/footers with correct page numbers in a second pass
    
    # ========== PAGE 1: RUSSIAN VERSION ==========
    
    # Draw header (without page numbers yet - we'll add them later)
    # For now, draw a simple header
    _draw_simple_header(p, width, height, contract_code, logo_path, qr_data)
    
    # Title - format date as DD-MM-YYYY
    y_position = height - 140
    
    try:
        p.setFont("DejaVu-Bold", 16)
    except:
        p.setFont("Helvetica-Bold", 16)
    
    # Parse and reformat date in title if present (convert 2026-01-27 to 27-01-2026)
    title_text = contract['title']
    import re
    date_pattern = r'(\d{4})-(\d{2})-(\d{2})'
    title_text = re.sub(date_pattern, r'\3-\2-\1', title_text)
    
    p.drawCentredString(width / 2, y_position, title_text[:60])
    
    y_position -= 25
    
    # Notice
    try:
        p.setFont("DejaVu", 8)
    except:
        p.setFont("Helvetica", 8)
    p.setFillColor(HexColor('#64748b'))
    notice_text = "Договор составлен на русском и казахском языках, оба текста имеют равную юридическую силу."
    p.drawCentredString(width / 2, y_position, notice_text)
    p.setFillColor(HexColor('#000000'))
    
    y_position -= 30
    
    # Russian content
    content_type = contract.get('content_type', 'plain')
    
    try:
        content_ru = contract.get('content', '')
        if content_type == 'html':
            content_ru = html_to_text_for_pdf(content_ru)
        content_ru = replace_placeholders_in_content(content_ru, contract, template)
    except Exception as e:
        logging.error(f"Error processing RU content: {str(e)}")
        content_ru = contract.get('content', 'Error loading content')
    
    y_position = draw_content_section(p, content_ru, y_position, width, height, "РУССКИЙ / RUSSIAN", start_new_page=False, page_info=page_info)
    
    # Russian signature block
    y_position = draw_signature_block(p, y_position, width, height, contract, signature, landlord, template, 'ru')
    
    # ========== PAGE N+1: KAZAKH VERSION ==========
    p.showPage()
    page_info['current_page'] += 1
    _draw_simple_header(p, width, height, contract_code, logo_path, qr_data)
    
    y_position = height - 120
    
    # Kazakh title
    try:
        p.setFont("DejaVu-Bold", 14)
    except:
        p.setFont("Helvetica-Bold", 14)
    # Convert title to Kazakh format
    kk_title = title_text.replace("Договор", "Шарт").replace("от", "")
    p.drawCentredString(width / 2, y_position, kk_title[:60])
    y_position -= 25
    
    try:
        content_kk = contract.get('content_kk', '')
        if not content_kk:
            content_kk = contract.get('content', '')
        if content_type == 'html':
            content_kk = html_to_text_for_pdf(content_kk)
        content_kk = replace_placeholders_in_content(content_kk, contract, template)
    except Exception as e:
        logging.error(f"Error processing KK content: {str(e)}")
        content_kk = contract.get('content_kk', contract.get('content', ''))
    
    y_position = draw_content_section(p, content_kk, y_position, width, height, "ҚАЗАҚША / KAZAKH", start_new_page=False, page_info=page_info)
    
    # Kazakh signature block
    y_position = draw_signature_block(p, y_position, width, height, contract, signature, landlord, template, 'kk')
    
    # ========== ENGLISH VERSION (if selected) ==========
    if include_english:
        p.showPage()
        page_info['current_page'] += 1
        _draw_simple_header(p, width, height, contract_code, logo_path, qr_data)
        
        y_position = height - 120
        
        # English title
        try:
            p.setFont("DejaVu-Bold", 14)
        except:
            p.setFont("Helvetica-Bold", 14)
        en_title = title_text.replace("Договор", "Contract").replace("от", "dated")
        p.drawCentredString(width / 2, y_position, en_title[:60])
        y_position -= 25
        
        try:
            content_en = contract.get('content_en', '')
            if not content_en:
                content_en = contract.get('content', '')
            if content_type == 'html':
                content_en = html_to_text_for_pdf(content_en)
            content_en = replace_placeholders_in_content(content_en, contract, template)
        except Exception as e:
            logging.error(f"Error processing EN content: {str(e)}")
            content_en = contract.get('content_en', contract.get('content', ''))
        
        y_position = draw_content_section(p, content_en, y_position, width, height, "ENGLISH", is_translation=True, start_new_page=False, page_info=page_info)
        
        # English signature block
        y_position = draw_signature_block(p, y_position, width, height, contract, signature, landlord, template, 'en')
    
    # ========== LAST PAGE: ID DOCUMENT (if available) ==========
    if signature and signature.get('document_upload'):
        p.showPage()
        page_info['current_page'] += 1
        _draw_simple_header(p, width, height, contract_code, logo_path, qr_data)
        
        y_position = height - 120
        
        try:
            p.setFont("DejaVu-Bold", 14)
        except:
            p.setFont("Helvetica-Bold", 14)
        
        p.setFillColor(HexColor('#1e40af'))
        p.drawCentredString(width / 2, y_position, "═══ УДОСТОВЕРЕНИЕ ЛИЧНОСТИ / ID DOCUMENT ═══")
        p.setFillColor(HexColor('#000000'))
        
        y_position -= 40
        
        try:
            import base64
            from PIL import Image as PILImage
            
            img_data = base64.b64decode(signature['document_upload'])
            img_buffer = BytesIO(img_data)
            img = PILImage.open(img_buffer)
            
            # Resize to fit
            max_width = 400
            max_height = 500
            img_ratio = img.width / img.height
            
            if img.width > max_width:
                new_width = max_width
                new_height = int(new_width / img_ratio)
            else:
                new_width = img.width
                new_height = img.height
            
            if new_height > max_height:
                new_height = max_height
                new_width = int(new_height * img_ratio)
            
            # Convert to RGB
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Save to buffer
            rgb_buffer = BytesIO()
            img.save(rgb_buffer, format='JPEG', quality=85)
            rgb_buffer.seek(0)
            
            # Draw image centered
            img_reader = ImageReader(rgb_buffer)
            x_pos = (width - new_width) / 2
            p.drawImage(img_reader, x_pos, y_position - new_height, width=new_width, height=new_height)
            
        except Exception as e:
            logging.error(f"Error adding ID document: {str(e)}")
            p.drawString(50, y_position, "Ошибка загрузки документа")
    
    # Save first pass PDF (without page numbers)
    p.save()
    pdf_buffer.seek(0)
    first_pass_pdf = pdf_buffer.getvalue()
    
    # ========== SECOND PASS: Add page numbers to all pages ==========
    try:
        from PyPDF2 import PdfReader, PdfWriter
        
        # Read the first pass PDF
        reader = PdfReader(BytesIO(first_pass_pdf))
        writer = PdfWriter()
        
        # Get ACTUAL total pages from the generated PDF
        total_pages = len(reader.pages)
        logging.info(f"📄 PDF generated with {total_pages} pages. Adding page numbers...")
        
        # Create page number overlays
        for page_num in range(total_pages):
            # Create overlay with page number
            overlay_buffer = BytesIO()
            overlay_canvas = canvas.Canvas(overlay_buffer, pagesize=A4)
            
            # Set font for page number
            try:
                overlay_canvas.setFont("DejaVu", 8)
            except:
                overlay_canvas.setFont("Helvetica", 8)
            
            overlay_canvas.setFillColor(HexColor('#94a3b8'))
            
            # Draw page number in footer
            overlay_canvas.drawCentredString(width / 2, 25, f"Страница {page_num + 1} из {total_pages}")
            overlay_canvas.drawString(40, 25, "2tick.kz — Электронная подпись договоров")
            overlay_canvas.drawRightString(width - 40, 25, f"№ {contract_code}")
            
            overlay_canvas.save()
            overlay_buffer.seek(0)
            
            # Merge overlay with page
            overlay_reader = PdfReader(overlay_buffer)
            page = reader.pages[page_num]
            page.merge_page(overlay_reader.pages[0])
            writer.add_page(page)
        
        # Write final PDF
        final_buffer = BytesIO()
        writer.write(final_buffer)
        final_buffer.seek(0)
        
        logging.info(f"✅ PDF with page numbers generated successfully ({total_pages} pages)")
        return final_buffer.getvalue()
        
    except Exception as e:
        logging.error(f"Error adding page numbers: {str(e)}")
        # Return first pass PDF without page numbers as fallback
        return first_pass_pdf

def replace_placeholders_in_content(content: str, contract: dict, template: dict = None) -> str:
    """Replace placeholders in contract content with actual values, respecting showInContent flag"""
    import re
    
    # Ensure content is string
    if not isinstance(content, str):
        content = str(content)
    
    # Get placeholder values from contract
    pv = contract.get('placeholder_values', {})
    
    # Get signature data for Party B (signer)
    signer_name = contract.get('signer_name', '')
    signer_phone = contract.get('signer_phone', '')
    signer_email = contract.get('signer_email', '')
    signer_iin = contract.get('signer_iin', '') or pv.get('PARTY_B_IIN', '') or pv.get('ID_CARD', '')
    
    # Map PARTY_B placeholders to signer data
    party_b_mapping = {
        'PARTY_B_NAME': signer_name,
        'PARTY_B_IIN': signer_iin,
        'PARTY_B_PHONE': signer_phone,
        'PARTY_B_EMAIL': signer_email,
        'PARTY_B_ADDRESS': pv.get('PARTY_B_ADDRESS', ''),
        'PARTY_B_BANK': pv.get('PARTY_B_BANK', ''),
        'PARTY_B_IBAN': pv.get('PARTY_B_IBAN', ''),
        'PARTY_B_ID_NUMBER': pv.get('PARTY_B_ID_NUMBER', ''),
        'PARTY_B_ID_ISSUED': pv.get('PARTY_B_ID_ISSUED', ''),
        'PARTY_B_ID_DATE': pv.get('PARTY_B_ID_DATE', ''),
    }
    
    # Replace PARTY_B placeholders first (before general template processing)
    for key, value in party_b_mapping.items():
        if value:
            pattern = re.compile(f'{{{{\\s*{key}\\s*}}}}')
            content = pattern.sub(str(value), content)
    
    # Handle new {{placeholder}} format with template
    if template and template.get('placeholders'):
        for key, config in template['placeholders'].items():
            # Skip placeholders that should NOT appear in content
            if config.get('showInContent') == False:
                continue
            
            # Get value from contract placeholder_values OR party_b_mapping
            value = pv.get(key, '') or party_b_mapping.get(key, '')
            if value:
                # Replace {{key}} with value
                pattern = re.compile(f'{{{{\\s*{key}\\s*}}}}')
                content = pattern.sub(str(value), content)
                
                # Also replace [label] format if label exists
                label = config.get('label', '')
                label_kk = config.get('label_kk', '')
                label_en = config.get('label_en', '')
                
                if label:
                    content = content.replace(f'[{label}]', str(value))
                if label_kk:
                    content = content.replace(f'[{label_kk}]', str(value))
                if label_en:
                    content = content.replace(f'[{label_en}]', str(value))
    
    # Handle [Label] format placeholders using placeholder_values mapping
    # Map common labels to their placeholder keys
    label_to_key_map = {
        # Russian labels - Party B (Signer)
        'имя': ['NAME2', 'SIGNER_NAME', '1NAME', 'PARTY_B_NAME'],
        'фио': ['NAME2', 'SIGNER_NAME', 'PARTY_B_NAME'],
        'фио нанимателя': ['NAME2', 'SIGNER_NAME', 'PARTY_B_NAME'],
        'фио/наименование стороны б': ['PARTY_B_NAME', 'NAME2', 'SIGNER_NAME'],
        'наименование стороны б': ['PARTY_B_NAME', 'NAME2'],
        'иин/бин стороны б': ['PARTY_B_IIN', 'ID_CARD', 'IIN'],
        'иин стороны б': ['PARTY_B_IIN', 'ID_CARD'],
        'телефон стороны б': ['PARTY_B_PHONE', 'PHONE_NUM', 'PHONE'],
        'адрес стороны б': ['PARTY_B_ADDRESS'],
        'телефон': ['PHONE_NUM', 'PHONE', 'PARTY_B_PHONE'],
        'номер телефона': ['PHONE_NUM', 'PHONE', 'PARTY_B_PHONE'],
        'почта': ['EMAIL', 'PARTY_B_EMAIL'],
        'email': ['EMAIL', 'PARTY_B_EMAIL'],
        'email стороны б': ['PARTY_B_EMAIL', 'EMAIL'],
        'иин': ['ID_CARD', 'IIN', 'PARTY_B_IIN'],
        'адрес': ['ADDRESS', 'PARTY_B_ADDRESS'],
        # Kazakh labels
        'аты': ['NAME2', 'SIGNER_NAME', 'PARTY_B_NAME'],
        'атыңыз': ['NAME2', 'SIGNER_NAME', 'PARTY_B_NAME'],
        'нөмір': ['PHONE_NUM', 'PHONE', 'PARTY_B_PHONE'],
        'пошта': ['EMAIL', 'PARTY_B_EMAIL'],
        'мекенжай': ['ADDRESS', 'PARTY_B_ADDRESS'],
        # English labels
        'name': ['NAME2', 'SIGNER_NAME', 'PARTY_B_NAME'],
        'phone': ['PHONE_NUM', 'PHONE', 'PARTY_B_PHONE'],
        'address': ['ADDRESS', 'PARTY_B_ADDRESS'],
        'party b name': ['PARTY_B_NAME', 'NAME2'],
        'party b iin': ['PARTY_B_IIN', 'ID_CARD'],
    }
    
    # Find and replace all [Label] format placeholders
    placeholder_regex = re.compile(r'\[([^\]]+)\]')
    
    def replace_label(match):
        label = match.group(1)
        label_lower = label.lower()
        
        # Try to find value by label
        for label_pattern, keys in label_to_key_map.items():
            if label_pattern in label_lower:
                for key in keys:
                    # First check party_b_mapping
                    if party_b_mapping.get(key):
                        return str(party_b_mapping[key])
                    # Then check placeholder_values
                    if pv.get(key):
                        return str(pv[key])
        
        # Also try signer fields from contract
        if 'имя' in label_lower or 'фио' in label_lower or 'name' in label_lower or 'аты' in label_lower or 'сторон' in label_lower:
            if contract.get('signer_name'):
                return str(contract['signer_name'])
        if 'телефон' in label_lower or 'phone' in label_lower or 'нөмір' in label_lower:
            if contract.get('signer_phone'):
                return str(contract['signer_phone'])
        if 'почта' in label_lower or 'email' in label_lower or 'пошта' in label_lower:
            if contract.get('signer_email'):
                return str(contract['signer_email'])
        if 'иин' in label_lower or 'iin' in label_lower or 'бин' in label_lower:
            if signer_iin:
                return str(signer_iin)
        
        # Keep original if no value found
        return match.group(0)
    
    content = placeholder_regex.sub(replace_label, content)
    
    # Legacy replacements for old contracts
    signer_name = str(contract.get('signer_name', '')) if contract.get('signer_name') else ''
    signer_phone = str(contract.get('signer_phone', '')) if contract.get('signer_phone') else ''
    signer_email = str(contract.get('signer_email', '')) if contract.get('signer_email') else ''
    move_in_date = str(contract.get('move_in_date', '')) if contract.get('move_in_date') else ''
    move_out_date = str(contract.get('move_out_date', '')) if contract.get('move_out_date') else ''
    property_address = str(contract.get('property_address', '')) if contract.get('property_address') else ''
    rent_amount = str(contract.get('rent_amount', '')) if contract.get('rent_amount') else ''
    days_count = str(contract.get('days_count', '')) if contract.get('days_count') else ''
    
    if signer_name:
        content = content.replace('[ФИО Нанимателя]', signer_name)
        content = content.replace('[ФИО]', signer_name)
    
    if signer_phone:
        content = content.replace('[Телефон]', signer_phone)
    
    if signer_email:
        content = content.replace('[Email]', signer_email)
    
    if move_in_date:
        content = content.replace('[Дата заселения]', move_in_date)
    
    if move_out_date:
        content = content.replace('[Дата выселения]', move_out_date)
    
    if property_address:
        content = content.replace('[Адрес квартиры]', property_address)
    
    if rent_amount:
        content = content.replace('[Цена в сутки]', rent_amount)
    
    if days_count:
        content = content.replace('[Количество суток]', days_count)
    
    # Direct replacement of {{KEY}} placeholders with values from placeholder_values
    # This ensures all placeholder formats are replaced
    for key, value in pv.items():
        if value:
            # Replace {{KEY}} format (with optional spaces)
            pattern = re.compile(f'{{{{\\s*{key}\\s*}}}}', re.IGNORECASE)
            content = pattern.sub(str(value), content)
    
    return content

def verify_document_ocr(file_data: str) -> bool:
    """Mocked OCR verification for ID/passport"""
    logging.info(f"[MOCK OCR] Document verification passed")
    return True

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    return verify_jwt_token(token)

async def log_audit(action: str, contract_id: str = None, user_id: str = None, details: str = None, ip: str = None):
    log = AuditLog(action=action, contract_id=contract_id, user_id=user_id, details=details, ip_address=ip)
    doc = log.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.audit_logs.insert_one(doc)

async def log_user_action(user_id: str, action: str, details: str = None, ip: str = None, metadata: dict = None):
    """Enhanced logging for user actions"""
    log_entry = {
        "user_id": user_id,
        "action": action,
        "details": details,
        "ip_address": ip,
        "metadata": metadata or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.user_logs.insert_one(log_entry)

# ===== AUTH ROUTES =====
@api_router.post("/auth/check-user-exists")
async def check_user_exists(data: dict):
    """Check if user with given email or phone already exists (only verified users)"""
    email = data.get('email')
    phone = data.get('phone')
    
    # Check in users collection (verified users only)
    if email:
        existing_user = await db.users.find_one({"email": email})
        if existing_user:
            return {"exists": True, "field": "email"}
    
    if phone:
        existing_user = await db.users.find_one({"phone": phone})
        if existing_user:
            return {"exists": True, "field": "phone"}
    
    # Clean up expired/unverified pending registrations before checking
    # This allows users to re-register if they didn't complete verification
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    
    if email:
        # Delete expired or old unverified registrations for this email
        await db.registrations.delete_many({"email": email})
    
    if phone:
        # Delete expired or old unverified registrations for this phone
        await db.registrations.delete_many({"phone": phone})
    
    return {"exists": False}

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if there's a pending registration with this email
    pending = await db.registrations.find_one({"email": user_data.email})
    if pending and not pending.get('verified'):
        # Delete expired or unverified registration
        await db.registrations.delete_one({"email": user_data.email})
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create temporary registration record
    registration = Registration(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        company_name=user_data.company_name,
        iin=user_data.iin,
        legal_address=user_data.legal_address,
        language=user_data.language
    )
    
    registration_doc = registration.model_dump()
    registration_doc['created_at'] = registration_doc['created_at'].isoformat()
    registration_doc['expires_at'] = registration_doc['expires_at'].isoformat()
    
    await db.registrations.insert_one(registration_doc)
    
    await log_audit("registration_created", details=f"Registration created for {user_data.email}, registration_id: {registration.id}")
    
    return {
        "registration_id": registration.id,
        "phone": user_data.phone,
        "message": "Registration created. Please verify your phone number."
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, request: Request):
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        await log_user_action("unknown", "login_failed", f"Email: {credentials.email}", request.client.host)
        raise HTTPException(status_code=401, detail="Пользователь с таким email не найден")
    
    # Check if user is deactivated
    if user_doc.get('is_active') == False:
        await log_user_action(user_doc['id'], "login_blocked", "Account deactivated", request.client.host)
        raise HTTPException(status_code=403, detail="Аккаунт деактивирован. Обратитесь к администратору.")
    
    # Verify password
    if not verify_password(credentials.password, user_doc['password']):
        await log_user_action(user_doc['id'], "login_failed", "Wrong password", request.client.host)
        raise HTTPException(status_code=401, detail="Неверный пароль")
    
    # Convert to User model
    user_doc.pop('password', None)
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    # Set role based on is_admin flag
    if user_doc.get('is_admin'):
        user_doc['role'] = 'admin'
    
    user = User(**user_doc)
    
    # Generate token
    token = create_jwt_token(user.id, user.email, user.role)
    
    # Log successful login
    await log_user_action(user.id, "login_success", f"Email: {user.email}", request.client.host)
    
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    return User(**user_doc)


@api_router.put("/auth/me")
async def update_me(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user profile"""
    user_doc = await db.users.find_one({"id": current_user['user_id']})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if user_update.full_name is not None:
        update_data['full_name'] = user_update.full_name
    if user_update.phone is not None:
        update_data['phone'] = user_update.phone
    if user_update.company_name is not None:
        update_data['company_name'] = user_update.company_name
    if user_update.iin is not None:
        update_data['iin'] = user_update.iin
    if user_update.legal_address is not None:
        update_data['legal_address'] = user_update.legal_address
    
    if update_data:
        await db.users.update_one(
            {"id": current_user['user_id']},
            {"$set": update_data}
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password": 0})
    if isinstance(updated_user.get('created_at'), str):
        updated_user['created_at'] = datetime.fromisoformat(updated_user['created_at'])
    return User(**updated_user)

@api_router.get("/auth/me/stats")
async def get_me_stats(current_user: dict = Depends(get_current_user)):
    """Get current user statistics"""
    # Count contracts by status (реальные статусы: draft, sent, pending-signature, signed, declined)
    total_contracts = await db.contracts.count_documents({"creator_id": current_user['user_id'], "deleted": {"$ne": True}})
    signed = await db.contracts.count_documents({"creator_id": current_user['user_id'], "status": "signed", "deleted": {"$ne": True}})
    pending_signature = await db.contracts.count_documents({"creator_id": current_user['user_id'], "status": "pending-signature", "deleted": {"$ne": True}})
    sent = await db.contracts.count_documents({"creator_id": current_user['user_id'], "status": "sent", "deleted": {"$ne": True}})
    draft = await db.contracts.count_documents({"creator_id": current_user['user_id'], "status": "draft", "deleted": {"$ne": True}})
    
    # signed_contracts = signed (подписано)
    # pending_contracts = pending-signature + sent + draft (в ожидании)
    # contracts_used = total_contracts (использовано от лимита)
    
    return {
        "total_contracts": total_contracts,
        "signed_contracts": signed,
        "pending_contracts": pending_signature + sent + draft,
        "contracts_used": total_contracts
    }

@api_router.get("/users/me/contract-limit")
async def get_my_contract_limit(current_user: dict = Depends(get_current_user)):
    """Get current user's contract limit info"""
    user_doc = await db.users.find_one({"id": current_user['user_id']})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    contract_limit = user_doc.get('contract_limit', 3)
    contracts_used = await db.contracts.count_documents({
        "creator_id": current_user['user_id'], 
        "deleted": {"$ne": True}
    })
    
    return {
        "contract_limit": contract_limit,
        "contracts_used": contracts_used,
        "remaining": max(contract_limit - contracts_used, 0)
    }

@api_router.post("/auth/change-password")
async def change_password(
    change_pwd: ChangePassword,
    current_user: dict = Depends(get_current_user)
):
    """Change password for logged-in user"""
    # Get user from database
    user_doc = await db.users.find_one({"id": current_user['user_id']})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify old password
    if not verify_password(change_pwd.old_password, user_doc['password']):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash new password
    new_password_hash = hash_password(change_pwd.new_password)
    
    # Update password in database
    await db.users.update_one(
        {"id": current_user['user_id']},
        {"$set": {"password": new_password_hash}}
    )
    
    await log_audit("password_changed", user_id=current_user['user_id'], details="User changed password")
    
    return {"message": "Password changed successfully"}

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset code to user's email"""
    # Find user by email
    user_doc = await db.users.find_one({"email": request.email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Пользователь с таким email не зарегистрирован")
    
    # Generate 6-digit code
    reset_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Delete any existing reset codes for this email
    await db.password_resets.delete_many({"email": request.email})
    
    # Save reset code to database
    reset_doc = PasswordReset(
        email=request.email,
        reset_code=reset_code
    )
    await db.password_resets.insert_one(reset_doc.model_dump())
    
    # Multi-language email content
    lang = request.language
    
    if lang == "kk":
        subject = "Құпия сөзді қалпына келтіру коды - 2tick.kz"
        title = "Құпия сөзді қалпына келтіру сұрауы"
        text1 = "Сіз 2tick.kz жүйесінде құпия сөзіңізді қалпына келтіруді сұрадыңыз."
        text2 = "Құпия сөзді қалпына келтіру коды:"
        text3 = "Бұл код <strong>1 сағат</strong> ішінде жарамды."
        text4 = "Егер сіз бұл сұрауды жасамасаңыз, бұл хатты елемеңіз."
        footer = "2tick.kz — Қашықтан шарттарға қол қою платформасы"
    elif lang == "en":
        subject = "Password Reset Code - 2tick.kz"
        title = "Password Reset Request"
        text1 = "You requested to reset your password for 2tick.kz."
        text2 = "Your password reset code is:"
        text3 = "This code will expire in <strong>1 hour</strong>."
        text4 = "If you didn't request this, please ignore this email."
        footer = "2tick.kz — Remote Contract Signing Platform"
    else:  # Russian default
        subject = "Код восстановления пароля - 2tick.kz"
        title = "Запрос на восстановление пароля"
        text1 = "Вы запросили восстановление пароля для 2tick.kz."
        text2 = "Ваш код для восстановления пароля:"
        text3 = "Этот код действителен <strong>1 час</strong>."
        text4 = "Если вы не запрашивали это, проигнорируйте это письмо."
        footer = "2tick.kz — Платформа дистанционного подписания договоров"
    
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">{title}</h2>
                <p>{text1}</p>
                <p>{text2}</p>
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                    {reset_code}
                </div>
                <p>{text3}</p>
                <p>{text4}</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 12px;">{footer}</p>
            </div>
        </body>
    </html>
    """
    
    send_email_async(request.email, subject, body)
    
    await log_audit("password_reset_requested", details=f"Reset code sent to {request.email}")
    
    return {"message": "If the email exists, a reset code has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPassword):
    """Reset password using the code sent via email"""
    # Find reset code in database
    reset_doc = await db.password_resets.find_one({
        "email": request.email,
        "reset_code": request.reset_code,
        "used": False
    })
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    
    # Check if code is expired
    expires_at = reset_doc.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    # Ensure expires_at has timezone info (whether from string or datetime)
    if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset code has expired")
    
    # Find user
    user_doc = await db.users.find_one({"email": request.email})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash new password
    new_password_hash = hash_password(request.new_password)
    
    # Update password
    await db.users.update_one(
        {"email": request.email},
        {"$set": {"password": new_password_hash}}
    )
    
    # Mark reset code as used
    await db.password_resets.update_one(
        {"email": request.email, "reset_code": request.reset_code},
        {"$set": {"used": True}}
    )
    
    await log_audit("password_reset", details=f"Password reset for {request.email}")
    
    return {"message": "Password has been reset successfully"}

@api_router.get("/users/{user_id}")
async def get_user_by_id(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get user by ID - for displaying landlord info in contracts"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return only public info (no password hash)
    return {
        "id": user.get("id"),
        "full_name": user.get("full_name"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "company_name": user.get("company_name"),
        "iin": user.get("iin"),
        "legal_address": user.get("legal_address")
    }

@api_router.post("/auth/update-profile")
async def update_profile(
    iin: Optional[str] = Form(None),
    iin_bin: Optional[str] = Form(None),  # Support both iin and iin_bin from frontend
    company_name: Optional[str] = Form(None),
    legal_address: Optional[str] = Form(None),
    full_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    logging.info(f"🔥 DEBUG update_profile: iin={iin}, iin_bin={iin_bin}, company_name={company_name}, user_id={current_user['user_id']}")
    
    update_data = {}
    
    # Handle both iin and iin_bin parameters (frontend sends iin_bin, backend stores as iin)
    # Allow empty string to clear the field
    if iin_bin is not None and iin_bin != '':
        update_data['iin'] = iin_bin
        logging.info(f"🔥 DEBUG: Setting iin from iin_bin: {iin_bin}")
    elif iin_bin == '':
        update_data['iin'] = ''  # Allow clearing
        logging.info(f"🔥 DEBUG: Clearing iin (empty iin_bin)")
    elif iin is not None and iin != '':
        update_data['iin'] = iin
        logging.info(f"🔥 DEBUG: Setting iin from iin: {iin}")
    elif iin == '':
        update_data['iin'] = ''  # Allow clearing
        logging.info(f"🔥 DEBUG: Clearing iin (empty iin)")
    
    # Allow empty strings to clear fields
    if company_name is not None:
        update_data['company_name'] = company_name
    if legal_address is not None:
        update_data['legal_address'] = legal_address
    if full_name is not None:
        update_data['full_name'] = full_name
    if email is not None:
        update_data['email'] = email
    if phone is not None:
        update_data['phone'] = phone
    
    logging.info(f"🔥 DEBUG: update_data = {update_data}")
    
    if update_data:
        result = await db.users.update_one(
            {"id": current_user['user_id']},
            {"$set": update_data}
        )
        logging.info(f"🔥 DEBUG: MongoDB update result: matched={result.matched_count}, modified={result.modified_count}")
    else:
        logging.info("🔥 DEBUG: No update_data, skipping update")
    
    return {"message": "Profile updated"}

@api_router.post("/auth/upload-document")
async def upload_landlord_document(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Read file
    content = await file.read()
    
    # Handle PDF conversion
    file_data = None
    filename = file.filename
    
    if file.content_type == 'application/pdf' or filename.lower().endswith('.pdf'):
        try:
            from pdf2image import convert_from_bytes
            from PIL import Image as PILImage
            
            images = convert_from_bytes(content, first_page=1, last_page=1)
            if images:
                img = images[0]
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                max_size = (1200, 1600)
                img.thumbnail(max_size, PILImage.Resampling.LANCZOS)
                
                img_buffer = BytesIO()
                img.save(img_buffer, format='JPEG', quality=85)
                img_buffer.seek(0)
                
                file_data = base64.b64encode(img_buffer.getvalue()).decode()
                filename = filename.replace('.pdf', '.jpg')
        except Exception as e:
            logging.error(f"Error converting PDF: {str(e)}")
            raise HTTPException(status_code=400, detail="Error converting PDF document")
    else:
        file_data = base64.b64encode(content).decode()
    
    # Update user document
    await db.users.update_one(
        {"id": current_user['user_id']},
        {"$set": {
            "document_upload": file_data,
            "document_filename": filename
        }}
    )
    
    return {"message": "Document uploaded successfully"}

# ===== REGISTRATION VERIFICATION ROUTES =====
@api_router.post("/auth/registration/{registration_id}/request-otp")
async def request_registration_otp(registration_id: str, method: str = "sms"):
    """Request OTP for phone verification during registration (SMS)"""
    registration = await db.registrations.find_one({"id": registration_id})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration.get('verified'):
        raise HTTPException(status_code=400, detail="Registration already verified")
    
    # Check if expired
    expires_at = registration.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Registration expired. Please register again.")
    
    phone = registration.get('phone')
    email = registration.get('email')
    
    # Supported verification methods: sms, email, telegram
    if method not in ["sms", "email", "telegram"]:
        method = "sms"
    
    # Send OTP based on method
    if method == "email":
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in registration")
        result = await send_otp_via_email(email)
    elif method == "sms":
        if not phone:
            raise HTTPException(status_code=400, detail="Phone number not found")
        result = await send_otp(phone)
    else:
        # Telegram - handled separately
        if not phone:
            raise HTTPException(status_code=400, detail="Phone number not found")
        result = await send_otp(phone)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {result.get('error', 'Unknown error')}")
    
    # Store verification info
    update_data = {
        "verification_method": method,
        "otp_requested_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Store OTP code for verification
    if "otp_code" in result:
        update_data["otp_code"] = result["otp_code"]
    
    await db.registrations.update_one(
        {"id": registration_id},
        {"$set": update_data}
    )
    
    target = email if method == "email" else phone
    await log_audit("registration_otp_requested", details=f"Method: {method}, Target: {target}, registration_id: {registration_id}")
    
    return {"message": f"OTP sent via {method}"}

@api_router.post("/auth/registration/{registration_id}/verify-otp")
async def verify_registration_otp(registration_id: str, otp_data: dict):
    """Verify OTP and create user account"""
    registration = await db.registrations.find_one({"id": registration_id})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration.get('verified'):
        raise HTTPException(status_code=400, detail="Registration already verified")
    
    # Check if expired
    expires_at = registration.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Registration expired. Please register again.")
    
    phone = registration.get('phone')
    otp_code = otp_data.get('otp_code')
    
    if not otp_code:
        raise HTTPException(status_code=400, detail="OTP code is required")
    
    # Get stored OTP for KazInfoTech/mock verification
    stored_otp = registration.get('otp_code')
    
    # Verify OTP using unified function
    result = await verify_otp(phone, otp_code, stored_otp)
    
    if not result["success"]:
            raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    # OTP verified! Create user account
    # Generate unique user ID
    unique_id = await generate_unique_user_id()
    
    user = User(
        id=unique_id,
        email=registration['email'],
        full_name=registration['full_name'],
        phone=registration['phone'],
        company_name=registration['company_name'],
        iin=registration['iin'],
        legal_address=registration['legal_address'],
        language=registration.get('language', 'ru')
    )
    
    user_doc = user.model_dump()
    user_doc['password'] = registration['password_hash']
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Mark registration as verified and delete it
    await db.registrations.delete_one({"id": registration_id})
    
    # Generate token
    token = create_jwt_token(user.id, user.email, user.role)
    
    await log_audit("user_registered", user_id=user.id, details=f"User {user.email} registered after phone verification")
    
    return {"token": token, "user": user, "verified": True}

@api_router.post("/auth/registration/{registration_id}/request-call-otp")
async def request_registration_call_otp(registration_id: str):
    """Phone call verification removed - returns 410 Gone"""
    raise HTTPException(status_code=410, detail="Phone call verification is no longer available. Please use SMS or Telegram.")

@api_router.post("/auth/registration/{registration_id}/verify-call-otp")
async def verify_registration_call_otp(registration_id: str, data: dict):
    """Phone call verification removed - returns 410 Gone"""
    raise HTTPException(status_code=410, detail="Phone call verification is no longer available. Please use SMS or Telegram.")

@api_router.get("/auth/registration/{registration_id}/telegram-deep-link")
async def get_registration_telegram_deep_link(registration_id: str):
    """Get Telegram deep link for registration verification"""
    registration = await db.registrations.find_one({"id": registration_id})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration.get('verified'):
        raise HTTPException(status_code=400, detail="Registration already verified")
    
    # Check if expired
    expires_at = registration.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Registration expired. Please register again.")
    
    # Generate OTP code
    otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Store verification data with registration_id
    verification_data = {
        "registration_id": registration_id,
        "otp_code": otp_code,
        "method": "telegram",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "verified": False
    }
    
    # Delete any existing verification for this registration
    await db.verifications.delete_many({"registration_id": registration_id, "method": "telegram"})
    
    # Insert new verification
    await db.verifications.insert_one(verification_data)
    
    # Create deep link with registration_id
    deep_link = f"https://t.me/{TELEGRAM_BOT_USERNAME}?start=reg_{registration_id}"
    
    logging.info(f"✅ Telegram deep link created for registration {registration_id}")
    
    return {
        "deep_link": deep_link,
        "registration_id": registration_id,
        "message": "Нажмите на ссылку чтобы открыть Telegram и получить код"
    }

@api_router.post("/auth/registration/{registration_id}/verify-telegram-otp")
async def verify_registration_telegram_otp(registration_id: str, data: dict):
    """Verify Telegram OTP and create user account"""
    registration = await db.registrations.find_one({"id": registration_id})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if registration.get('verified'):
        raise HTTPException(status_code=400, detail="Registration already verified")
    
    code = data.get('code')
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
    
    # Find verification record
    verification = await db.verifications.find_one({
        "registration_id": registration_id,
        "method": "telegram",
        "verified": False
    })
    
    if not verification:
        raise HTTPException(status_code=404, detail="Telegram verification not found. Please request a new code.")
    
    # Check if expired
    expires_at = verification.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification expired. Please request a new code.")
    
    # Verify code
    expected_code = verification.get('otp_code')
    if code != expected_code:
        raise HTTPException(status_code=400, detail="Invalid code")
    
    # Mark verification as verified
    await db.verifications.update_one(
        {"_id": verification["_id"]},
        {"$set": {"verified": True}}
    )
    
    # Create user account
    # Generate unique user ID
    unique_id = await generate_unique_user_id()
    
    user = User(
        id=unique_id,
        email=registration['email'],
        full_name=registration['full_name'],
        phone=registration['phone'],
        company_name=registration['company_name'],
        iin=registration['iin'],
        legal_address=registration['legal_address'],
        language=registration.get('language', 'ru')
    )
    
    user_doc = user.model_dump()
    user_doc['password'] = registration['password_hash']
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Delete registration
    await db.registrations.delete_one({"id": registration_id})
    
    # Generate token
    token = create_jwt_token(user.id, user.email, user.role)
    
    await log_audit("user_registered", user_id=user.id, details=f"User {user.email} registered after Telegram verification")
    
    return {"token": token, "user": user, "verified": True}

# ===== CONTRACT ROUTES =====

def generate_contract_code():
    """Generate unique short contract code like ABC-1234"""
    import random
    import string
    # 3 uppercase letters + 4 digits
    letters = ''.join(random.choices(string.ascii_uppercase, k=3))
    numbers = ''.join(random.choices(string.digits, k=4))
    return f"{letters}-{numbers}"

@api_router.post("/contracts", response_model=Contract)
async def create_contract(contract_data: ContractCreate, current_user: dict = Depends(get_current_user)):
    # Get user IIN/BIN and full_name from profile
    user = await db.users.find_one({"id": current_user['user_id']})  # Поле в базе называется 'id', а в токене 'user_id'
    landlord_iin_bin = user.get('iin', '') if user else ''
    landlord_full_name = user.get('full_name', '') if user else ''
    
    # Check contract limit - count only SIGNED contracts
    signed_contract_count = await db.contracts.count_documents({
        "creator_id": current_user['user_id'],
        "status": "signed"
    })
    contract_limit = user.get('contract_limit', 3) if user else 3
    
    if signed_contract_count >= contract_limit:
        raise HTTPException(
            status_code=403, 
            detail=f"Contract limit reached. You have signed {signed_contract_count}/{contract_limit} contracts. Please upgrade your subscription."
        )
    
    # For contract numbering, count ALL contracts (not just signed)
    total_contract_count = await db.contracts.count_documents({"creator_id": current_user['user_id']})
    contract_num = total_contract_count + 1
    
    # Always start with 0, then the number: 01, 02, 03...09, 010, 011
    contract_number = f"0{contract_num}"
    
    # Generate unique contract code
    contract_code = generate_contract_code()
    # Ensure uniqueness (very rare collision, but check anyway)
    while await db.contracts.find_one({"contract_code": contract_code}):
        contract_code = generate_contract_code()
    
    contract = Contract(
        title=contract_data.title,
        content=contract_data.content,
        content_kk=contract_data.content_kk,  # Казахская версия
        content_en=contract_data.content_en,  # Английская версия
        content_type=contract_data.content_type,
        creator_id=current_user['user_id'],
        template_id=contract_data.template_id,  # Template ID if created from template
        placeholder_values=contract_data.placeholder_values or {},  # Placeholder values
        contract_number=contract_number,  # Sequential number with leading 0
        contract_code=contract_code,  # Unique code like ABC-1234
        signer_name=contract_data.signer_name or "",
        signer_phone=contract_data.signer_phone or "",
        signer_email=contract_data.signer_email,
        move_in_date=contract_data.move_in_date,
        move_out_date=contract_data.move_out_date,
        property_address=contract_data.property_address,
        rent_amount=contract_data.rent_amount,
        days_count=contract_data.days_count,
        amount=contract_data.amount,
        landlord_name=contract_data.landlord_name,
        landlord_email=current_user.get('email'),  # Email наймодателя из current_user
        landlord_full_name=landlord_full_name,  # ФИО наймодателя из профиля
        landlord_representative=contract_data.landlord_representative,
        landlord_iin_bin=landlord_iin_bin,  # From user profile
        party_a_role=contract_data.party_a_role or 'Сторона А',  # Роли из шаблона
        party_a_role_kk=contract_data.party_a_role_kk or 'А жағы',
        party_a_role_en=contract_data.party_a_role_en or 'Party A',
        party_b_role=contract_data.party_b_role or 'Сторона Б',
        party_b_role_kk=contract_data.party_b_role_kk or 'Б жағы',
        party_b_role_en=contract_data.party_b_role_en or 'Party B'
    )
    
    doc = contract.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    print(f"🔥 CREATE CONTRACT: ID={contract.id}, Code={contract_code}, Title={contract_data.title}")
    logging.info(f"🔥 CREATE CONTRACT: ID={contract.id}, Code={contract_code}")
    
    result = await db.contracts.insert_one(doc)
    print(f"🔥 INSERT RESULT: inserted_id={result.inserted_id}")
    logging.info(f"🔥 INSERT RESULT: inserted_id={result.inserted_id}")
    
    # Verify contract was saved
    saved = await db.contracts.find_one({"id": contract.id})
    print(f"🔥 VERIFY SAVED: {bool(saved)}")
    logging.info(f"🔥 VERIFY SAVED: {bool(saved)}")
    
    # Log contract creation
    if contract_data.template_id:
        await log_audit("contract_created_from_template", contract_id=contract.id, user_id=current_user['user_id'],
                       details=f"Contract created from template {contract_data.template_id}")
    else:
        await log_audit("contract_created", contract_id=contract.id, user_id=current_user['user_id'])
    
    # Log user action
    await log_user_action(
        current_user['user_id'],
        "contract_created",
        f"Договор #{contract_number} ({contract_code})"
    )
    
    return contract

@api_router.get("/contracts/limit/info")
async def get_contract_limit_info(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user['user_id']})
    contract_limit = user.get('contract_limit', 3) if user else 3
    # Count only SIGNED contracts
    signed_contract_count = await db.contracts.count_documents({
        "creator_id": current_user['user_id'],
        "status": "signed"
    })
    
    return {
        "limit": contract_limit,
        "used": signed_contract_count,
        "remaining": max(0, contract_limit - signed_contract_count),
        "exceeded": signed_contract_count >= contract_limit
    }

@api_router.get("/contracts", response_model=List[Contract])
async def get_contracts(current_user: dict = Depends(get_current_user)):
    # Filter out deleted contracts
    contracts = await db.contracts.find({
        "creator_id": current_user['user_id'],
        "$or": [
            {"deleted": {"$exists": False}},  # Old contracts without deleted field
            {"deleted": False}  # New contracts that are not deleted
        ]
    }, {"_id": 0}).to_list(1000)
    for c in contracts:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
        if isinstance(c.get('updated_at'), str):
            c['updated_at'] = datetime.fromisoformat(c['updated_at'])
    return contracts

@api_router.get("/verify/{contract_id}")
async def verify_contract_public(contract_id: str):
    """Public endpoint for contract verification via QR code - no auth required"""
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Return only safe public information
    return {
        "id": contract.get("id"),
        "title": contract.get("title"),
        "contract_code": contract.get("contract_code"),
        "status": contract.get("status"),
        "created_at": contract.get("created_at"),
        "approved_at": contract.get("approved_at"),
        "landlord_signature_hash": contract.get("landlord_signature_hash"),
        "signer_name": contract.get("signer_name"),
        "verified": contract.get("status") == "signed" and contract.get("landlord_signature_hash") is not None
    }

@api_router.get("/verify/{contract_id}/signature")
async def verify_contract_signature_public(contract_id: str):
    """Public endpoint for contract signature verification"""
    signature = await db.signatures.find_one({"contract_id": contract_id}, {"_id": 0})
    if not signature:
        return {"signature_hash": None, "created_at": None}
    
    return {
        "signature_hash": signature.get("signature_hash"),
        "created_at": signature.get("created_at")
    }

@api_router.get("/contracts/{contract_id}", response_model=Contract)
async def get_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if isinstance(contract.get('created_at'), str):
        contract['created_at'] = datetime.fromisoformat(contract['created_at'])
    if isinstance(contract.get('updated_at'), str):
        contract['updated_at'] = datetime.fromisoformat(contract['updated_at'])
    return Contract(**contract)

@api_router.put("/contracts/{contract_id}")
async def update_contract(contract_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    """Update contract fields"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Only allow updating certain fields
    allowed_fields = ['title', 'content', 'signer_name', 'signer_phone', 'signer_email', 'placeholder_values']
    filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    # If placeholder_values are being updated and contract has a template, replace placeholders in content
    if 'placeholder_values' in filtered_data and contract.get('template_id'):
        try:
            # Load template to get placeholder configs
            template = await db.contract_templates.find_one({"id": contract['template_id']})
            if template and template.get('placeholders'):
                content = contract.get('content', '')
                placeholder_values = filtered_data['placeholder_values']
                
                # Replace ONLY placeholders that have values (keep empty ones as {{key}})
                # КРИТИЧНО: НЕ заменяем плейсхолдеры стороны Б (owner=signer) при редактировании
                for key, value in placeholder_values.items():
                    if key in template['placeholders'] and value:  # Only replace if value is not empty
                        config = template['placeholders'][key]
                        
                        # ИСПРАВЛЕНИЕ: Пропускаем signer плейсхолдеры
                        owner = config.get('owner', 'landlord')
                        if owner in ['signer', 'tenant']:
                            print(f"⏭️ Skipping signer placeholder {key} in update_contract (owner={owner})")
                            continue
                        
                        # Format dates to DD.MM.YYYY
                        if config.get('type') == 'date':
                            try:
                                from datetime import datetime as dt
                                date_obj = dt.fromisoformat(value.replace('Z', '+00:00'))
                                value = date_obj.strftime('%d.%m.%Y')
                            except:
                                pass
                        
                        # Replace placeholder
                        import re
                        pattern = re.compile(f'{{{{\\s*{key}\\s*}}}}')
                        content = pattern.sub(str(value), content)
                
                # Update content with replaced placeholders
                filtered_data['content'] = content
        except Exception as e:
            print(f"Error replacing placeholders: {e}")
    
    if filtered_data:
        filtered_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.contracts.update_one(
            {"id": contract_id},
            {"$set": filtered_data}
        )
    
    return {"message": "Contract updated"}

@api_router.post("/contracts/{contract_id}/send")
async def send_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Generate signature link
    signature_link = f"/sign/{contract_id}"
    
    # Send SMS with link (mocked)
    otp_code = generate_otp()
    message = f"Signify KZ: Sign contract '{contract['title']}'. Link: {signature_link}. Code: {otp_code}"
    send_sms(contract['signer_phone'], message)
    
    # Update contract status
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "status": "sent",
            "signature_link": signature_link,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Store OTP for verification
    signature = Signature(
        contract_id=contract_id,
        signer_phone=contract['signer_phone'],
        verification_method="sms",
        otp_code=otp_code
    )
    sig_doc = signature.model_dump()
    sig_doc['created_at'] = sig_doc['created_at'].isoformat()
    await db.signatures.insert_one(sig_doc)
    
    await log_audit("contract_sent", contract_id=contract_id, user_id=current_user['user_id'])
    await log_user_action(
        current_user['user_id'],
        "contract_sent",
        f"Отправлен договор {contract.get('contract_code', contract_id)}"
    )
    
    return {"message": "Contract sent successfully", "signature_link": signature_link}

@api_router.get("/contracts/{contract_id}/signature")
async def get_signature(contract_id: str, current_user: dict = Depends(get_current_user)):
    signature = await db.signatures.find_one({"contract_id": contract_id}, {"_id": 0})
    if not signature:
        return None
    if isinstance(signature.get('created_at'), str):
        signature['created_at'] = datetime.fromisoformat(signature['created_at'])
    if isinstance(signature.get('signed_at'), str):
        signature['signed_at'] = datetime.fromisoformat(signature['signed_at'])
    return signature

@api_router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, current_user: dict = Depends(get_current_user)):
    # Get contract first to check status
    contract = await db.contracts.find_one({"id": contract_id, "creator_id": current_user['user_id']})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # If contract is signed, use soft delete (mark as deleted but keep in DB for limit counting)
    if contract.get('status') == 'signed':
        result = await db.contracts.update_one(
            {"id": contract_id, "creator_id": current_user['user_id']},
            {"$set": {"deleted": True, "updated_at": datetime.now(timezone.utc)}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Contract not found")
        await log_audit("contract_soft_deleted", contract_id=contract_id, user_id=current_user['user_id'], 
                       details="Signed contract marked as deleted")
        await log_user_action(current_user['user_id'], "contract_deleted", f"Удален договор {contract.get('contract_code')}")
    else:
        # For non-signed contracts, permanently delete
        result = await db.contracts.delete_one({"id": contract_id, "creator_id": current_user['user_id']})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Contract not found")
        await log_audit("contract_deleted", contract_id=contract_id, user_id=current_user['user_id'])
        await log_user_action(current_user['user_id'], "contract_deleted", f"Удален договор {contract.get('contract_code')}")
    
    return {"message": "Contract deleted"}

@api_router.post("/contracts/{contract_id}/upload-landlord-document")
async def upload_landlord_document(contract_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload landlord's ID/passport document for a contract"""
    contract = await db.contracts.find_one({"id": contract_id, "creator_id": current_user['user_id']})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Read file
    content = await file.read()
    
    # Check if it's a PDF and convert to image
    file_data = None
    filename = file.filename
    
    if file.content_type == 'application/pdf' or filename.lower().endswith('.pdf'):
        try:
            from pdf2image import convert_from_bytes
            from PIL import Image as PILImage
            
            # Convert PDF to images
            images = convert_from_bytes(content, first_page=1, last_page=1)
            
            if images:
                # Get first page
                img = images[0]
                
                # Convert to RGB if needed
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Resize if too large
                max_size = (1200, 1600)
                img.thumbnail(max_size, PILImage.Resampling.LANCZOS)
                
                # Save to buffer as JPEG
                img_buffer = BytesIO()
                img.save(img_buffer, format='JPEG', quality=85)
                img_buffer.seek(0)
                
                # Encode to base64
                file_data = base64.b64encode(img_buffer.getvalue()).decode()
                filename = filename.replace('.pdf', '.jpg')
                
                logging.info(f"PDF converted to image successfully")
        except Exception as e:
            logging.error(f"Error converting PDF: {str(e)}")
            raise HTTPException(status_code=400, detail="Error converting PDF document")
    else:
        # For images, just encode
        file_data = base64.b64encode(content).decode()
    
    # Store document in contract
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "landlord_document_upload": file_data,
            "landlord_document_filename": filename
        }}
    )
    
    await log_audit("landlord_document_uploaded", contract_id=contract_id, user_id=current_user['user_id'])
    
    return {"message": "Landlord document uploaded successfully"}

# ===== SIGNING ROUTES (PUBLIC) =====
@api_router.get("/sign/{contract_id}")
async def get_contract_for_signing(contract_id: str):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if isinstance(contract.get('created_at'), str):
        contract['created_at'] = datetime.fromisoformat(contract['created_at'])
    if isinstance(contract.get('updated_at'), str):
        contract['updated_at'] = datetime.fromisoformat(contract['updated_at'])
    
    # Get signature data (including document_upload if exists)
    signature = await db.signatures.find_one({"contract_id": contract_id}, {"_id": 0})
    
    # If signature doesn't exist, create it automatically (for direct signing links)
    if not signature:
        # ИСПРАВЛЕНИЕ: Извлекаем телефон ТОЛЬКО из полей принадлежащих Стороне Б
        signer_phone = contract.get('signer_phone', '')
        signer_name = contract.get('signer_name', '')
        
        # Если данные не установлены, ищем в placeholder_values с учётом владельца поля
        if not signer_phone or not signer_name:
            # Получаем шаблон чтобы узнать владельцев полей
            template = None
            if contract.get('template_id'):
                template = await db.templates.find_one({"id": contract['template_id']}, {"_id": 0})
            
            placeholder_values = contract.get('placeholder_values') or {}
            template_placeholders = template.get('placeholders', {}) if template else {}
            
            for key, value in placeholder_values.items():
                if not value:
                    continue
                    
                # Проверяем владельца поля в шаблоне
                config = template_placeholders.get(key, {})
                owner = config.get('owner', 'landlord')
                
                # КРИТИЧНО: Берём данные ТОЛЬКО из полей Стороны Б
                if owner not in ['signer', 'tenant']:
                    continue
                
                field_type = config.get('type', '')
                
                if not signer_phone and field_type == 'phone':
                    signer_phone = value
                    print(f"🔧 Extracted signer_phone from placeholder_values[{key}] (owner={owner}): {signer_phone}")
                elif not signer_name and field_type == 'text' and ('name' in key.lower() or 'фио' in key.lower()):
                    signer_name = value
                    print(f"🔧 Extracted signer_name from placeholder_values[{key}] (owner={owner}): {signer_name}")
        
        # ИСПРАВЛЕНИЕ: Автоматическое создание signature для прямых ссылок
        initial_signature = {
            "contract_id": contract_id,
            "signer_phone": signer_phone,
            "signer_name": signer_name,
            "verification_method": None,
            "verified": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.signatures.insert_one(initial_signature)
        
        # Обновляем contract если данные были извлечены
        updates = {}
        if signer_phone and not contract.get('signer_phone'):
            updates['signer_phone'] = signer_phone
            contract['signer_phone'] = signer_phone
        if signer_name and not contract.get('signer_name'):
            updates['signer_name'] = signer_name
            contract['signer_name'] = signer_name
            
        if updates:
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": updates}
            )
            print(f"🔧 Updated contract with signer info: {updates}")
        
        signature = await db.signatures.find_one({"contract_id": contract_id}, {"_id": 0})
    
    if signature:
        # Don't include full document_upload in response (too large), just flag
        contract['signature'] = {
            "has_document": bool(signature.get('document_upload')),
            "document_upload": signature.get('document_upload'),  # Include for preview
            "verified": signature.get('verified', False)
        }
    
    return Contract(**contract)

class SignerInfoUpdate(BaseModel):
    signer_name: Optional[str] = None
    signer_phone: Optional[str] = None
    signer_email: Optional[str] = None
    placeholder_values: Optional[dict] = None

@api_router.post("/sign/{contract_id}/update-placeholder-values")
async def update_placeholder_values_for_signing(contract_id: str, data: dict):
    """Public endpoint for updating placeholder values during contract signing"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    placeholder_values = data.get('placeholder_values', {})
    
    if placeholder_values:
        # Update placeholder_values in contract
        await db.contracts.update_one(
            {"id": contract_id},
            {"$set": {
                "placeholder_values": placeholder_values,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Also update signer_phone if it's in placeholder_values
        phone = None
        for key in ['tenant_phone', 'signer_phone', 'client_phone', 'phone', 'НОМЕР_КЛИЕНТА']:
            if key in placeholder_values and placeholder_values[key]:
                phone = placeholder_values[key]
                break
        
        if phone:
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {"signer_phone": phone}}
            )
    
    return {"message": "Placeholder values updated successfully"}

@api_router.post("/sign/{contract_id}/update-signer-info")
async def update_signer_info(contract_id: str, data: SignerInfoUpdate):
    print(f"🔧 Update signer info called: name={data.signer_name}, phone={data.signer_phone}, email={data.signer_email}, placeholder_values={data.placeholder_values}")
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    update_data = {}
    if data.signer_name:
        update_data['signer_name'] = data.signer_name
    if data.signer_phone:
        update_data['signer_phone'] = data.signer_phone
    if data.signer_email:
        update_data['signer_email'] = data.signer_email
    
    # Handle placeholder_values if provided - MERGE with existing values
    if data.placeholder_values:
        existing_values = contract.get('placeholder_values', {})
        update_data['placeholder_values'] = {**existing_values, **data.placeholder_values}
        
        # КРИТИЧНО: Автоматически копируем данные стороны Б из placeholder_values
        # Имя стороны Б
        for key in ['PARTY_B_NAME', 'NAME2', 'SIGNER_NAME', '1NAME', 'ФИО', 'ФИО_НАНИМАТЕЛЯ', 'TENANT_NAME']:
            if key in data.placeholder_values and data.placeholder_values[key]:
                update_data['signer_name'] = data.placeholder_values[key]
                print(f"👤 Имя найдено в placeholder_values[{key}]: {data.placeholder_values[key]}")
                break
        
        # Телефон стороны Б
        for key in ['PARTY_B_PHONE', 'PHONE_NUM', 'PHONE', 'ТЕЛЕФОН', 'TENANT_PHONE']:
            if key in data.placeholder_values and data.placeholder_values[key]:
                update_data['signer_phone'] = data.placeholder_values[key]
                print(f"📱 Телефон найден в placeholder_values[{key}]: {data.placeholder_values[key]}")
                break
        
        # ИИН стороны Б  
        for key in ['PARTY_B_IIN', 'ID_CARD', 'IIN', 'ИИН', 'TENANT_IIN']:
            if key in data.placeholder_values and data.placeholder_values[key]:
                update_data['signer_iin'] = data.placeholder_values[key]
                print(f"🆔 ИИН найден в placeholder_values[{key}]: {data.placeholder_values[key]}")
                break
        
        # Email стороны Б
        for key in ['PARTY_B_EMAIL', 'EMAIL_КЛИЕНТА', 'EMAIL_НАНИМАТЕЛЯ', 'EMAIL', 'email', 'TENANT_EMAIL']:
            if key in data.placeholder_values and data.placeholder_values[key]:
                update_data['signer_email'] = data.placeholder_values[key]
                print(f"📧 Email найден в placeholder_values[{key}]: {data.placeholder_values[key]}")
                break
    
    print(f"🔧 Update data: {update_data}")
    
    if update_data:
        # Update the content with new signer information or placeholder values
        current_content = contract.get('content', '')
        updated_content = current_content
        
        # If placeholder_values are being updated and contract has a template, replace placeholders in content
        if data.placeholder_values and contract.get('template_id'):
            try:
                print(f"🔧 Updating placeholders for template contract {contract_id}")
                
                # Load template to get placeholder configs
                template = await db.contract_templates.find_one({"id": contract['template_id']})
                if template and template.get('placeholders'):
                    # ИСПРАВЛЕНО: Используем объединенные значения, а не только новые
                    placeholder_values = update_data.get('placeholder_values', {})
                    
                    print(f"🔧 Template placeholders: {list(template['placeholders'].keys())}")
                    print(f"🔧 Values to replace: {placeholder_values}")
                    print(f"🔧 Original content preview: {updated_content[:200]}...")
                    
                    # Get existing placeholder values to know what to replace
                    existing_values = contract.get('placeholder_values', {})
                    print(f"🔧 Existing values: {existing_values}")
                    
                    # Update ALL content versions (RU, KK, EN)
                    content_fields = [
                        ('content', updated_content),
                        ('content_kk', contract.get('content_kk', '')),
                        ('content_en', contract.get('content_en', ''))
                    ]
                    
                    updated_contents = {}
                    
                    for field_name, field_content in content_fields:
                        if not field_content:
                            continue
                            
                        current_content = field_content
                        
                        # Replace values in content using ONLY {{KEY}} pattern
                        # КРИТИЧНО: НЕ заменяем плейсхолдеры стороны Б (owner=signer/tenant) 
                        # если договор ещё не подписан - они должны заполняться стороной Б
                        contract_status = contract.get('status', 'draft')
                        
                        for key, config in template['placeholders'].items():
                            if key in placeholder_values:
                                new_value = placeholder_values[key]
                                
                                # ИСПРАВЛЕНИЕ БАГА: Не заменяем signer плейсхолдеры при создании/редактировании стороной А
                                # Только при подписании (status меняется на signed) или если это signer заполняет
                                owner = config.get('owner', 'landlord')
                                if owner in ['signer', 'tenant'] and contract_status != 'signed':
                                    print(f"⏭️ [{field_name}] Skipping signer placeholder {{{{{key}}}}} (owner={owner}, status={contract_status})")
                                    continue
                                
                                if new_value:  # Replace if we have a new value
                                    # Format dates to DD.MM.YYYY
                                    if config.get('type') == 'date':
                                        try:
                                            from datetime import datetime as dt
                                            date_obj = dt.fromisoformat(new_value.replace('Z', '+00:00'))
                                            new_value = date_obj.strftime('%d.%m.%Y')
                                        except:
                                            pass
                                    
                                    old_content = current_content
                                    
                                    # ONLY use exact {{KEY}} replacement to avoid confusion
                                    # between placeholders with same labels (e.g., landlord and tenant both have "Name")
                                    import re
                                    pattern = re.compile(f'{{{{\\s*{key}\\s*}}}}')
                                    current_content = pattern.sub(str(new_value), current_content)
                                    
                                    if old_content != current_content:
                                        print(f"🔧 ✅ [{field_name}] Replaced {{{{{key}}}}} with value: {new_value}")
                        
                        updated_contents[field_name] = current_content
                    
                    # Apply updated contents
                    if 'content' in updated_contents:
                        updated_content = updated_contents['content']
                    if 'content_kk' in updated_contents:
                        update_data['content_kk'] = updated_contents['content_kk']
                    if 'content_en' in updated_contents:
                        update_data['content_en'] = updated_contents['content_en']
                    
                    print(f"🔧 Final content preview: {updated_content[:200]}...")
                    print(f"🔧 ✅ Placeholders replacement completed for all language versions")
                    
            except Exception as e:
                logging.error(f"Error replacing placeholders: {e}")
                logging.error(f"Template: {template}")
                logging.error(f"Placeholder values: {placeholder_values}")
        
        else:
            # Old logic for contracts without template
            # Get current and new values
            old_name = contract.get('signer_name', '[ФИО]')
            old_phone = contract.get('signer_phone', '[Телефон]')
            old_email = contract.get('signer_email', '[Email]')
            
            new_name = data.signer_name or old_name
            new_phone = data.signer_phone or old_phone
            new_email = data.signer_email or old_email
            
            # Replace placeholders or old values with new values
            # Support both [ФИО] and [ФИО Нанимателя] placeholders
            if data.signer_name:
                updated_content = updated_content.replace('[ФИО Нанимателя]', new_name)
                updated_content = updated_content.replace('[ФИО]', new_name)
                if old_name and old_name not in ['[ФИО]', '[ФИО Нанимателя]']:
                    updated_content = updated_content.replace(old_name, new_name)
            
            if data.signer_phone:
                updated_content = updated_content.replace('[Телефон]', new_phone)
                if old_phone and old_phone != '[Телефон]':
                    updated_content = updated_content.replace(old_phone, new_phone)
            
            if data.signer_email:
                updated_content = updated_content.replace('[Email]', new_email)
                if old_email and old_email != '[Email]':
                    updated_content = updated_content.replace(old_email, new_email)
        
        # Add content to update data
        update_data['content'] = updated_content
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.contracts.update_one(
            {"id": contract_id},
            {"$set": update_data}
        )
        
        await log_audit("signer_info_updated", contract_id=contract_id, 
                       details=f"Updated: {', '.join(update_data.keys())}")
    
    # Return updated contract
    updated_contract = await db.contracts.find_one({"id": contract_id})
    
    return {
        "message": "Signer info updated",
        "contract": {
            "signer_name": updated_contract.get('signer_name'),
            "signer_phone": updated_contract.get('signer_phone'),
            "signer_email": updated_contract.get('signer_email'),
            "content": updated_contract.get('content')
        }
    }

@api_router.post("/sign/{contract_id}/set-contract-language")
async def set_contract_language(contract_id: str, data: dict):
    """Public endpoint to set FIXED contract language (one-time only)"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Check if contract language is already set
    if contract.get('contract_language'):
        return {
            "message": "Contract language already set", 
            "contract_language": contract['contract_language'],
            "locked": True
        }
    
    language = data.get('language', 'ru')
    if language not in ['ru', 'kk', 'en']:
        raise HTTPException(status_code=400, detail="Invalid language. Must be: ru, kk, or en")
    
    # Set contract language PERMANENTLY
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "contract_language": language,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logging.info(f"✅ Contract {contract_id} language LOCKED to: {language}")
    
    return {
        "message": "Contract language set permanently", 
        "contract_language": language,
        "locked": True
    }

@api_router.post("/sign/{contract_id}/accept-english-disclaimer")
async def accept_english_disclaimer(contract_id: str):
    """Public endpoint to accept English disclaimer"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.get('signing_language') != 'en':
        raise HTTPException(status_code=400, detail="Disclaimer only required for English language")
    
    # Mark that user accepted the English disclaimer
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "english_disclaimer_accepted": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "English disclaimer accepted"}

@api_router.post("/sign/{contract_id}/upload-document")
async def upload_document(contract_id: str, file: UploadFile = File(...)):
    """Upload identity document (image or PDF)"""
    logging.info(f"Document upload started for contract {contract_id}")
    logging.info(f"File: {file.filename}, Content-Type: {file.content_type}")
    
    # Read file
    content = await file.read()
    logging.info(f"File size: {len(content)} bytes")
    
    # Check if it's a PDF and convert to image
    file_data = None
    filename = file.filename
    
    is_pdf = file.content_type == 'application/pdf' or filename.lower().endswith('.pdf')
    logging.info(f"Is PDF: {is_pdf}")
    
    if is_pdf:
        try:
            from pdf2image import convert_from_bytes
            from PIL import Image as PILImage
            
            logging.info("Starting PDF conversion...")
            
            # Convert PDF to images
            images = convert_from_bytes(content, first_page=1, last_page=1, dpi=150)
            logging.info(f"PDF converted, got {len(images)} pages")
            
            if images:
                # Get first page
                img = images[0]
                logging.info(f"Image size: {img.size}, mode: {img.mode}")
                
                # Convert to RGB if needed
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Resize if too large
                max_size = (1200, 1600)
                img.thumbnail(max_size, PILImage.Resampling.LANCZOS)
                
                # Save to buffer as JPEG
                img_buffer = BytesIO()
                img.save(img_buffer, format='JPEG', quality=85)
                img_buffer.seek(0)
                
                # Encode to base64
                file_data = base64.b64encode(img_buffer.getvalue()).decode()
                filename = filename.replace('.pdf', '.jpg').replace('.PDF', '.jpg')
                
                logging.info(f"PDF converted to image successfully, new filename: {filename}")
            else:
                logging.error("No images extracted from PDF")
                raise HTTPException(status_code=400, detail="Could not extract image from PDF")
        except Exception as e:
            logging.error(f"Error converting PDF: {str(e)}")
            import traceback
            logging.error(traceback.format_exc())
            raise HTTPException(status_code=400, detail=f"Error converting PDF: {str(e)}")
    else:
        # For images, just encode
        file_data = base64.b64encode(content).decode()
        logging.info("Image encoded to base64")
    
    # Mock OCR validation
    if not verify_document_ocr(file_data):
        logging.warning("Document OCR verification failed")
        raise HTTPException(status_code=400, detail="Document verification failed")
    
    # Store document
    await db.signatures.update_one(
        {"contract_id": contract_id},
        {"$set": {
            "document_upload": file_data,
            "document_filename": filename
        }},
        upsert=True
    )
    
    await log_audit("document_uploaded", contract_id=contract_id)
    logging.info(f"Document uploaded successfully for contract {contract_id}")
    
    return {"message": "Document uploaded successfully"}

@api_router.post("/sign/{contract_id}/request-otp")
async def request_otp(contract_id: str, method: str = "sms"):
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Try to get phone from signer_phone field first
    phone_to_use = contract.get('signer_phone')
    email_to_use = contract.get('signer_email')
    
    # If not found and contract has placeholder_values, search there
    if (not phone_to_use or not email_to_use) and contract.get('placeholder_values'):
        placeholder_values = contract.get('placeholder_values', {})
        # Try common phone field keys
        if not phone_to_use:
            for key in ['tenant_phone', 'signer_phone', 'client_phone', 'phone']:
                if key in placeholder_values and placeholder_values[key]:
                    phone_to_use = placeholder_values[key]
                    break
        # Try common email field keys
        if not email_to_use:
            for key in ['tenant_email', 'signer_email', 'client_email', 'email']:
                if key in placeholder_values and placeholder_values[key]:
                    email_to_use = placeholder_values[key]
                    break
    
    # Supported verification methods: sms, email, telegram
    if method not in ["sms", "email", "telegram"]:
        method = "sms"
    
    # Send OTP based on method
    if method == "email":
        if not email_to_use:
            raise HTTPException(status_code=400, detail="Signer email is required for email verification")
        result = await send_otp_via_email(email_to_use)
        target = email_to_use
    elif method == "sms":
        if not phone_to_use:
            raise HTTPException(status_code=400, detail="Signer phone number is required")
        result = await send_otp(phone_to_use)
        target = phone_to_use
    else:
        # Telegram
        if not phone_to_use:
            raise HTTPException(status_code=400, detail="Signer phone number is required")
        result = await send_otp(phone_to_use)
        target = phone_to_use
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {result.get('error', 'Unknown error')}")
    
    # Store verification info in signature
    update_data = {
        "verification_method": method,
        "signer_phone": phone_to_use,
        "signer_email": email_to_use,
        "otp_requested_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Store OTP code for verification
    if "otp_code" in result:
        update_data["otp_code"] = result["otp_code"]
    
    await db.signatures.update_one(
        {"contract_id": contract_id},
        {"$set": update_data},
        upsert=True
    )
    
    await log_audit("otp_requested", contract_id=contract_id, details=f"Method: {method}, Target: {target}")
    
    return {"message": f"OTP sent via {method}"}

@api_router.post("/sign/{contract_id}/request-call-otp")
async def request_call_otp(contract_id: str):
    """Request phone call verification - DEPRECATED, call verification removed"""
    raise HTTPException(
        status_code=410, 
        detail="Call verification is no longer supported. Please use SMS or Telegram."
    )

@api_router.get("/sign/{contract_id}/telegram-deep-link")
async def get_telegram_deep_link(contract_id: str):
    """Generate Telegram deep link for OTP verification"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Generate 6-digit OTP and store it
    import random
    otp_code = f"{random.randint(100000, 999999)}"
    
    # Store verification data (pre-generate OTP)
    verification_data = {
        "contract_id": contract_id,
        "otp_code": otp_code,
        "method": "telegram",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "verified": False
    }
    
    await db.verifications.insert_one(verification_data)
    
    # Create deep link
    deep_link = f"https://t.me/{TELEGRAM_BOT_USERNAME}?start={contract_id}"
    
    logging.info(f"✅ Generated Telegram deep link for contract {contract_id}, OTP: {otp_code}")
    
    return {
        "deep_link": deep_link,
        "bot_username": TELEGRAM_BOT_USERNAME,
        "contract_id": contract_id
    }


@api_router.get("/sign/{contract_id}/view-pdf")
async def view_pdf_for_signer(contract_id: str):
    """Public endpoint to view uploaded PDF for signing (no auth required)"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Check if it's an uploaded PDF contract
    if contract.get('source_type') != 'uploaded_pdf':
        raise HTTPException(status_code=400, detail="This contract does not have an uploaded PDF")
    
    # Get the uploaded PDF path
    pdf_path = contract.get('uploaded_pdf_path')
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    # Read and return the PDF
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=contract-{contract_id}.pdf"}
    )

@api_router.post("/sign/{contract_id}/request-telegram-otp")
async def request_telegram_otp(contract_id: str, data: dict):
    """Request OTP via Telegram - user provides their Telegram username"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    telegram_username = data.get('telegram_username', '').strip().replace('@', '')
    if not telegram_username:
        raise HTTPException(status_code=400, detail="Telegram username required")
    
    # Get language for message translation
    language = data.get('language', 'ru').lower()
    if language not in ['ru', 'kk', 'en']:
        language = 'ru'
    
    # Translations for OTP message
    translations = {
        'ru': {'message': 'Ваш код', 'button': '📋 Скопировать код'},
        'kk': {'message': 'Сіздің кодыңыз', 'button': '📋 Кодты көшіру'},
        'en': {'message': 'Your code is', 'button': '📋 Copy Code'}
    }
    
    # Generate 6-digit OTP
    import random
    otp_code = f"{random.randint(100000, 999999)}"
    
    # Send via Telegram bot
    try:
        # Check if Telegram bot is properly configured
        if not TELEGRAM_BOT_TOKEN:
            # Fallback to mock mode
            logging.warning(f"[MOCK TELEGRAM] Bot not configured. OTP: {otp_code} for @{telegram_username}")
            
            # Store verification data for mock mode
            verification_data = {
                "contract_id": contract_id,
                "telegram_username": telegram_username,
                "otp_code": otp_code,
                "method": "telegram",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                "verified": False
            }
            
            await db.verifications.insert_one(verification_data)
            
            return {
                "message": f"Код отправлен в Telegram @{telegram_username}",
                "telegram_username": telegram_username
            }
        
        from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, CopyTextButton
        import asyncio
        
        bot = Bot(token=TELEGRAM_BOT_TOKEN)
        
        # Create localized message and button
        msg_text = translations[language]['message']
        btn_text = translations[language]['button']
        
        message = f"{msg_text} `{otp_code}`"
        keyboard = [[InlineKeyboardButton(btn_text, copy_text=CopyTextButton(text=otp_code))]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        # Try to send message
        try:
            # First try to load chat_id from file
            chat_ids_file = '/tmp/telegram_chat_ids.json'
            chat_id = None
            
            try:
                import json
                if os.path.exists(chat_ids_file):
                    with open(chat_ids_file, 'r') as f:
                        chat_ids = json.load(f)
                        chat_id = chat_ids.get(telegram_username)
            except Exception as e:
                logging.warning(f"Could not load chat IDs: {str(e)}")
            
            if chat_id:
                # Use stored chat_id with Copy button
                await bot.send_message(
                    chat_id=chat_id,
                    text=message,
                    parse_mode='Markdown',
                    reply_markup=reply_markup
                )
                logging.info(f"✅ Telegram message sent to {telegram_username} (chat_id: {chat_id})")
            else:
                # Fallback: try username (will likely fail)
                await bot.send_message(
                    chat_id=f"@{telegram_username}",
                    text=message,
                    parse_mode='Markdown',
                    reply_markup=reply_markup
                )
                logging.info(f"✅ Telegram message sent to @{telegram_username}")
                
        except Exception as e:
            # If sending fails, use fallback mode like Twilio
            logging.error(f"Telegram send error: {str(e)}")
            
            # Check if it's a common error that should trigger fallback
            error_str = str(e).lower()
            if ('chat not found' in error_str or 
                'user not found' in error_str or 
                'forbidden' in error_str or
                'unauthorized' in error_str):
                
                logging.warning(f"[MOCK TELEGRAM FALLBACK] Telegram error ({str(e)}). OTP: {otp_code} for @{telegram_username}")
                
                # Store verification data for fallback mode
                verification_data = {
                    "contract_id": contract_id,
                    "telegram_username": telegram_username,
                    "otp_code": otp_code,
                    "method": "telegram",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                    "verified": False
                }
                
                await db.verifications.insert_one(verification_data)
                
                return {
                    "message": f"Код отправлен в Telegram @{telegram_username}",
                    "telegram_username": telegram_username
                }
            else:
                # For other errors, still raise exception
                raise HTTPException(
                    status_code=400, 
                    detail=f"Не удалось отправить сообщение. Убедитесь что вы написали боту @{TELEGRAM_BOT_USERNAME} команду /start"
                )
        
        # Store verification data
        verification_data = {
            "contract_id": contract_id,
            "telegram_username": telegram_username,
            "otp_code": otp_code,
            "method": "telegram",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "verified": False
        }
        
        await db.verifications.insert_one(verification_data)
        
        logging.info(f"✅ Telegram OTP sent to @{telegram_username}")
        
        return {
            "message": f"Код отправлен в Telegram @{telegram_username}",
            "telegram_username": telegram_username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Telegram OTP error: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка отправки Telegram сообщения")

@api_router.post("/sign/{contract_id}/verify-telegram-otp")
async def verify_telegram_otp(contract_id: str, data: dict):
    """Verify Telegram OTP code - accepts ANY valid unexpired code for this contract"""
    entered_code = data.get('code', '').strip()
    
    if not entered_code or len(entered_code) != 6:
        raise HTTPException(status_code=400, detail="Введите 6-значный код")
    
    # Find ANY matching verification record (not just the latest one)
    # This allows user to use any of the generated codes within expiry time
    verification = await db.verifications.find_one({
        "contract_id": contract_id,
        "method": "telegram",
        "otp_code": entered_code,
        "verified": False
    })
    
    if not verification:
        # Check if code exists but already used
        used_verification = await db.verifications.find_one({
            "contract_id": contract_id,
            "method": "telegram",
            "otp_code": entered_code,
            "verified": True
        })
        
        if used_verification:
            raise HTTPException(status_code=400, detail="Этот код уже использован. Запросите новый код.")
        else:
            raise HTTPException(status_code=400, detail="Неверный код. Проверьте код в Telegram или запросите новый.")
    
    # Check if expired
    expires_at = datetime.fromisoformat(verification['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Код истек. Нажмите /start в боте для нового кода.")
    
    # Code is valid - mark as verified
    await db.verifications.update_one(
        {"_id": verification['_id']},
        {"$set": {"verified": True}}
    )
    
    # Sign contract (same as SMS/Call)
    signature = await db.signatures.find_one({"contract_id": contract_id})
    if not signature:
        raise HTTPException(status_code=404, detail="Signature not found")
    
    # Get telegram username from verification or bot
    telegram_username = verification.get('telegram_username', '')
    
    # If not in verification, try to get from signature
    if not telegram_username:
        signature_full = await db.signatures.find_one({"contract_id": contract_id})
        telegram_username = signature_full.get('telegram_username', '') if signature_full else ''
    
    # For signature hash - use username if available, otherwise just contract_id
    if telegram_username:
        signature_data = f"{contract_id}-{telegram_username}-{datetime.now(timezone.utc).isoformat()}"
    else:
        signature_data = f"{contract_id}-telegram-{datetime.now(timezone.utc).isoformat()}"
    
    signature_hash = hashlib.sha256(signature_data.encode()).hexdigest()[:16].upper()
    
    await db.signatures.update_one(
        {"contract_id": contract_id},
        {"$set": {
            "verified": True,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "signature_hash": signature_hash,
            "verification_method": "telegram",
            "telegram_username": telegram_username if telegram_username else None
        }}
    )
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "status": "pending-signature",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "verification_method": "telegram",
            "telegram_username": telegram_username if telegram_username else None
        }}
    )
    
    await log_audit("signature_verified_telegram", contract_id=contract_id)
    
    # Get contract info for logging
    contract = await db.contracts.find_one({"id": contract_id})
    if contract:
        # Log to creator's logs that tenant signed via Telegram
        await log_user_action(
            contract.get('creator_id'),
            "contract_signed_by_tenant",
            f"✅ Верификация через Telegram успешна. Наниматель подписал договор {contract.get('contract_code')} и отправил на утверждение"
        )
    
    logging.info(f"✅ Contract {contract_id} signed with Telegram OTP: {entered_code}")
    
    return {"message": "Договор успешно подписан!", "verified": True, "signature_hash": signature_hash}

@api_router.post("/sign/{contract_id}/verify-call-otp")
async def verify_call_otp(contract_id: str, data: dict):
    """Verify the last 4 digits entered by user"""
    entered_code = data.get('code', '').strip()
    
    if not entered_code or len(entered_code) != 4:
        raise HTTPException(status_code=400, detail="Введите 4 цифры")
    
    # Find verification record
    verification = await db.verifications.find_one({
        "contract_id": contract_id,
        "method": "call",
        "verified": False
    })
    
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")
    
    # Check if expired
    expires_at = datetime.fromisoformat(verification['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Код истек. Запросите новый звонок.")
    
    # Verify code
    expected_code = verification['expected_code']
    if entered_code == expected_code:
        # Mark verification as verified
        await db.verifications.update_one(
            {"_id": verification['_id']},
            {"$set": {"verified": True}}
        )
        
        logging.info(f"✅ Call OTP verified for contract {contract_id}")
        
        # Now SIGN the contract (same as SMS OTP)
        # Find signature
        signature = await db.signatures.find_one({"contract_id": contract_id})
        if not signature:
            raise HTTPException(status_code=404, detail="Signature not found")
        
        # Generate unique signature hash
        signer_phone = signature.get('signer_phone', verification['phone'])
        signature_data = f"{contract_id}-{signer_phone}-{datetime.now(timezone.utc).isoformat()}"
        signature_hash = hashlib.sha256(signature_data.encode()).hexdigest()[:16].upper()
        
        # Mark signature as verified and signed
        await db.signatures.update_one(
            {"contract_id": contract_id},
            {"$set": {
                "verified": True,
                "signed_at": datetime.now(timezone.utc).isoformat(),
                "signature_hash": signature_hash,
                "verification_method": "call",
                "signer_phone": signer_phone
            }}
        )
        
        # Update contract status to pending-signature (waiting for landlord approval)
        await db.contracts.update_one(
            {"id": contract_id},
            {"$set": {
                "status": "pending-signature",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "verification_method": "call",
                "signer_phone": signer_phone
            }}
        )
        
        await log_audit("signature_verified", contract_id=contract_id)
        
        # Get contract info for logging
        contract = await db.contracts.find_one({"id": contract_id})
        if contract:
            # Log to creator's logs that tenant signed via Call
            await log_user_action(
                contract.get('creator_id'),
                "contract_signed_by_tenant",
                f"✅ Верификация через входящий звонок успешна. Наниматель подписал договор {contract.get('contract_code')} и отправил на утверждение"
            )
        
        return {"message": "Договор успешно подписан!", "verified": True, "signature_hash": signature_hash}
    else:
        logging.warning(f"❌ Wrong code entered: {entered_code}, expected: {expected_code}")
        raise HTTPException(status_code=400, detail="Неверный код. Проверьте последние 4 цифры номера.")

@api_router.post("/sign/{contract_id}/verify-otp")
async def verify_signature_otp(contract_id: str, otp_data: OTPVerify):
    """Verify OTP for contract signing"""
    # Find signature
    signature = await db.signatures.find_one({"contract_id": contract_id})
    if not signature:
        raise HTTPException(status_code=404, detail="Signature not found")
    
    # Get stored OTP for KazInfoTech/mock verification
    stored_otp = signature.get('otp_code')
    
    # Verify OTP using unified function
    verification_result = await verify_otp(otp_data.phone, otp_data.otp_code, stored_otp)
    
    if not verification_result["success"]:
        raise HTTPException(status_code=400, detail=verification_result.get("error", "Invalid OTP code"))
    
    # Generate unique signature hash
    signer_phone = signature.get('signer_phone', otp_data.phone)
    signature_data = f"{contract_id}-{signer_phone}-{datetime.now(timezone.utc).isoformat()}"
    signature_hash = hashlib.sha256(signature_data.encode()).hexdigest()[:16].upper()
    
    # Mark as verified and signed
    # Get signer phone from signature
    signature_full = await db.signatures.find_one({"contract_id": contract_id})
    signer_phone = signature_full.get('signer_phone', '') if signature_full else ''
    
    await db.signatures.update_one(
        {"contract_id": contract_id},
        {"$set": {
            "verified": True,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "signature_hash": signature_hash,
            "verification_method": "sms",
            "signer_phone": signer_phone
        }}
    )
    
    # Update contract status
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "status": "pending-signature",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "verification_method": "sms",
            "signer_phone": signer_phone
        }}
    )
    
    await log_audit("signature_verified", contract_id=contract_id)
    
    # Get contract info for logging
    contract = await db.contracts.find_one({"id": contract_id})
    if contract:
        # Log to creator's logs that tenant signed via SMS
        await log_user_action(
            contract.get('creator_id'),
            "contract_signed_by_tenant",
            f"✅ Верификация через SMS успешна. Наниматель подписал договор {contract.get('contract_code')} и отправил на утверждение"
        )
    
    return {"message": "Signature verified successfully", "verified": True, "signature_hash": signature_hash}

@api_router.post("/contracts/{contract_id}/approve-for-signing")
async def approve_contract_for_signing(contract_id: str, current_user: dict = Depends(get_current_user)):
    """Утвердить договор перед отправкой клиенту (фиксирует content и placeholder values)"""
    contract = await db.contracts.find_one({"id": contract_id})
    
    if not contract:
        raise HTTPException(status_code=404, detail="Договор не найден")
    
    # Проверка прав доступа
    if contract.get('creator_id') != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Доступ запрещен")
    
    # Если договор уже утвержден, ошибка
    if contract.get('approved'):
        raise HTTPException(status_code=400, detail="Договор уже утвержден")
    
    # Зафиксировать content и placeholder_values
    current_content = contract.get('content', '')
    current_placeholder_values = contract.get('placeholder_values', {})
    
    # Обновить договор
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "approved": True,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_content": current_content,
            "approved_placeholder_values": current_placeholder_values,
            "status": "sent",  # Изменить статус на "sent" (отправлен клиенту)
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_audit("contract_approved_for_signing", contract_id=contract_id, user_id=current_user['user_id'])
    
    # Отправить email клиенту с договором
    if contract.get('signer_email'):
        # Generate PDF with approved content
        landlord = await db.users.find_one({"id": contract.get('creator_id')})
        signature = await db.signatures.find_one({"contract_id": contract_id})
        
        # Temporarily update contract with approved values for PDF generation
        pdf_contract = {**contract, 'content': current_content, 'placeholder_values': current_placeholder_values}
        
        # Get template if contract has one
        template = None
        if contract.get('template_id'):
            template = await db.templates.find_one({"id": contract['template_id']}, {"_id": 0})
        
        pdf_bytes = generate_contract_pdf(pdf_contract, signature, None, landlord, template)
        
        subject = f"📄 Договор на подпись: {contract['title']}"
        body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .header h1 {{ color: white; margin: 0; font-size: 24px; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 Договор готов к подписанию</h1>
        </div>
        <div class="content">
            <p>Здравствуйте!</p>
            <p>Договор "<strong>{contract['title']}</strong>" утвержден и готов к подписанию.</p>
            <p>Пожалуйста, ознакомьтесь с договором во вложении и перейдите по ссылке для подписания.</p>
            <p style="text-align: center;">
                <a href="{APP_URL}/sign/{contract_id}" class="button">
                    ✍️ Подписать договор
                </a>
            </p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Договор прикреплен к этому письму в формате PDF.
            </p>
        </div>
        <div class="footer">
            <p>© 2tick.kz - Подписывайте договоры за 2 клика</p>
        </div>
    </div>
</body>
</html>
"""
        
        try:
            # Run email sending in background to avoid blocking
            import asyncio
            loop = asyncio.get_event_loop()
            loop.run_in_executor(
                None,
                send_email,
                contract['signer_email'],
                subject,
                body,
                pdf_bytes,
                f"Contract_{contract.get('contract_code', contract_id)}.pdf"
            )
            print(f"📧 Email task queued for {contract['signer_email']}")
        except Exception as e:
            print(f"Error queueing email: {e}")
    
    return {
        "message": "Договор утвержден и отправлен клиенту",
        "contract_id": contract_id,
        "approved_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/contracts/{contract_id}/approve")
async def approve_signature(contract_id: str, current_user: dict = Depends(get_current_user)):
    # Generate landlord signature hash
    signature_data = f"{contract_id}-landlord-{current_user['user_id']}-{datetime.now(timezone.utc).isoformat()}"
    landlord_signature_hash = hashlib.sha256(signature_data.encode()).hexdigest()[:16].upper()
    
    # Update contract to signed
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "status": "signed",
            "landlord_signature_hash": landlord_signature_hash,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_audit("contract_approved", contract_id=contract_id, user_id=current_user['user_id'])
    
    # Get contract info for logging
    contract = await db.contracts.find_one({"id": contract_id})
    await log_user_action(
        current_user['user_id'],
        "contract_approved",
        f"Утвержден договор {contract.get('contract_code', contract_id)}"
    )
    
    print(f"🔥 DEBUG: Approve called for contract {contract_id}")
    logging.info(f"🔥 DEBUG: Approve called for contract {contract_id}")
    
    # Get contract and signature for email
    signature = await db.signatures.find_one({"contract_id": contract_id})
    creator = await db.users.find_one({"id": contract['creator_id']})
    
    print(f"🔥 DEBUG: Contract email: {contract.get('signer_email')}")
    logging.info(f"🔥 DEBUG: Contract email: {contract.get('signer_email')}")
    
    # Generate PDF for email
    print(f"🔥 DEBUG: Starting PDF generation...")
    try:
        print(f"🔥 DEBUG: Inside try block")
        
        # Get landlord info
        landlord = await db.users.find_one({"id": contract.get('creator_id')})
        
        # Get template if contract has one
        template = None
        print(f"🔥 DEBUG: contract.template_id = {contract.get('template_id')}")
        if contract.get('template_id'):
            template = await db.templates.find_one({"id": contract['template_id']}, {"_id": 0})
            print(f"🔥 DEBUG: Template loaded from DB: {bool(template)}")
            if template:
                print(f"🔥 DEBUG: Template has {len(template.get('placeholders', {}))} placeholders")
        else:
            print(f"🔥 DEBUG: Contract has no template_id!")
        
        # Use the centralized PDF generation function
        print(f"🔥 DEBUG: Calling generate_contract_pdf with template={bool(template)}")
        pdf_bytes = generate_contract_pdf(contract, signature, landlord_signature_hash, landlord, template)
        print(f"🔥 DEBUG: PDF generated, size: {len(pdf_bytes)} bytes")
        
        # Send email to signer
        if contract.get('signer_email'):
            subject = f"Договор подписан — 2tick.kz"
            
            # Professional email design with blue theme - no emojis
            verification_url = f"https://2tick.kz/verify/{contract['id']}"
            body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f0f9ff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(37, 99, 235, 0.12);">
                    
                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 35px 30px; text-align: center;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <img src="{EMAIL_LOGO_URL}" alt="2tick.kz" width="55" height="55" style="border-radius: 12px; display: block; margin: 0 auto;">
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 15px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="background: rgba(255,255,255,0.2); border-radius: 50px; padding: 8px 20px;">
                                                    <span style="color: #ffffff; font-size: 14px; font-weight: 600;">Успешно подписан</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <!-- Greeting -->
                            <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1e293b;">
                                Поздравляем, {contract['signer_name']}!
                            </h1>
                            <p style="margin: 0 0 25px 0; font-size: 15px; color: #64748b; line-height: 1.6;">
                                Ваш договор был успешно подписан обеими сторонами и теперь имеет юридическую силу.
                            </p>
                            
                            <!-- Contract Card -->
                            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 16px; padding: 25px; margin-bottom: 25px; border: 1px solid #bfdbfe;">
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">Название договора</p>
                                <p style="margin: 0 0 15px 0; font-size: 17px; font-weight: 700; color: #1e40af;">{contract['title']}</p>
                                
                                <div style="display: table; width: 100%;">
                                    <div style="display: table-cell; width: 50%;">
                                        <p style="margin: 0 0 3px 0; font-size: 11px; color: #64748b;">Номер договора</p>
                                        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">{contract.get('contract_code', contract['id'][:8])}</p>
                                    </div>
                                    <div style="display: table-cell; width: 50%; text-align: right;">
                                        <p style="margin: 0 0 3px 0; font-size: 11px; color: #64748b;">Дата подписания</p>
                                        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">{datetime.now().strftime('%d.%m.%Y')}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- PDF Attachment Notice -->
                            <div style="background: #f8fafc; border-radius: 12px; padding: 18px 20px; margin-bottom: 25px; border-left: 4px solid #2563eb;">
                                <p style="margin: 0; font-size: 14px; color: #475569;">
                                    <strong>Подписанный договор</strong> прикреплен к этому письму в формате PDF. Сохраните его для своих записей.
                                </p>
                            </div>
                            
                            <!-- Signatures Section -->
                            <div style="margin-bottom: 25px;">
                                <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; font-weight: 600;">Цифровые подписи сторон:</p>
                                
                                <div style="background: #f1f5f9; border-radius: 10px; padding: 14px 16px; margin-bottom: 8px;">
                                    <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; font-weight: 500;">Сторона Б ({contract['signer_name']})</p>
                                    <p style="margin: 0; font-size: 11px; font-family: 'SF Mono', 'Courier New', monospace; color: #475569; word-break: break-all;">{signature.get('signature_hash', 'N/A')}</p>
                                </div>
                                
                                <div style="background: #f1f5f9; border-radius: 10px; padding: 14px 16px;">
                                    <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; font-weight: 500;">Сторона А</p>
                                    <p style="margin: 0; font-size: 11px; font-family: 'SF Mono', 'Courier New', monospace; color: #475569; word-break: break-all;">{landlord_signature_hash}</p>
                                </div>
                            </div>
                            
                            <!-- Action Button -->
                            <div style="text-align: center;">
                                <a href="{verification_url}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 35px; border-radius: 10px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">
                                    Подробнее
                                </a>
                                <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8;">
                                    Проверьте статус договора онлайн
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #1e293b; padding: 25px 40px; text-align: center;">
                            <p style="margin: 0 0 5px 0; font-size: 15px; color: #ffffff; font-weight: 600;">
                                2tick.kz
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                Надежная платформа для электронного подписания договоров
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            """
            
            print(f"🔥 DEBUG: About to call send_email_async to {contract['signer_email']}")
            # Send email in background for faster response
            send_email_async(
                contract['signer_email'],
                subject,
                body,
                pdf_bytes,
                f"contract-{contract_id}.pdf"
            )
            print(f"⚡ Email queued for {contract['signer_email']}")
    except Exception as e:
        print(f"🔥 DEBUG: Exception in try block: {str(e)}")
        logging.error(f"❌ Error generating PDF or sending email: {str(e)}")
        import traceback
        print(traceback.format_exc())
        logging.error(traceback.format_exc())
    
    return {"message": "Contract approved and signed", "landlord_signature_hash": landlord_signature_hash}

# ===== PDF GENERATION =====
@api_router.get("/contracts/{contract_id}/download")
async def download_contract_pdf(contract_id: str, current_user: dict = Depends(get_current_user)):
    """Download contract as PDF - for both landlords and admins"""
    print(f"🔥 DEBUG: download_contract_pdf called for contract {contract_id}")
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        print(f"❌ Contract not found: {contract_id}")
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Check permissions - landlord or admin can download
    user_role = current_user.get('role')
    is_owner = (contract.get('landlord_id') == current_user.get('user_id') or 
                contract.get('creator_id') == current_user.get('user_id'))
    
    if user_role != 'admin' and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    print(f"✅ Contract found: {contract['title']}")
    
    signature = await db.signatures.find_one({"contract_id": contract_id})
    print(f"✅ Signature: {bool(signature)}")
    
    # Get landlord signature hash if contract is signed/approved
    landlord_signature_hash = contract.get('landlord_signature_hash')
    print(f"✅ Landlord hash: {bool(landlord_signature_hash)}")
    
    # Get landlord info - try both landlord_id and creator_id
    landlord = None
    if contract.get('landlord_id'):
        landlord = await db.users.find_one({"id": contract.get('landlord_id')})
    if not landlord and contract.get('creator_id'):
        landlord = await db.users.find_one({"id": contract.get('creator_id')})
    
    # Get template if contract has one
    template = None
    if contract.get('template_id'):
        template = await db.templates.find_one({"id": contract['template_id']}, {"_id": 0})
    
    # Generate PDF using centralized function
    try:
        print(f"🔥 Generating PDF...")
        pdf_bytes = generate_contract_pdf(contract, signature, landlord_signature_hash, landlord, template)
        print(f"✅ PDF generated: {len(pdf_bytes)} bytes")
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=contract_{contract['contract_code']}.pdf"}
        )
        
    except Exception as e:
        print(f"❌ PDF generation error: {e}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@api_router.get("/contracts/{contract_id}/download-pdf")
async def download_pdf(contract_id: str, current_user: dict = Depends(get_current_user)):
    print(f"🔥 DEBUG: download_pdf called for contract {contract_id}")
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        print(f"❌ Contract not found: {contract_id}")
        raise HTTPException(status_code=404, detail="Contract not found")
    
    print(f"✅ Contract found: {contract['title']}")
    
    signature = await db.signatures.find_one({"contract_id": contract_id})
    print(f"✅ Signature: {bool(signature)}")
    
    # Get landlord signature hash if contract is signed/approved
    landlord_signature_hash = contract.get('landlord_signature_hash')
    print(f"✅ Landlord hash: {bool(landlord_signature_hash)}")
    
    # Get landlord info
    landlord = await db.users.find_one({"id": contract.get('creator_id')})
    
    # Get template if contract has one
    template = None
    print(f"🔥 DEBUG: contract.template_id = {contract.get('template_id')}")
    if contract.get('template_id'):
        template = await db.templates.find_one({"id": contract['template_id']}, {"_id": 0})
        print(f"🔥 DEBUG: Template loaded from DB: {bool(template)}")
        if template:
            print(f"🔥 DEBUG: Template has {len(template.get('placeholders', {}))} placeholders")
    else:
        print(f"🔥 DEBUG: Contract has no template_id!")
    
    # Generate PDF using centralized function
    try:
        print(f"🔥 Generating PDF with template={bool(template)}...")
        pdf_bytes = generate_contract_pdf(contract, signature, landlord_signature_hash, landlord, template)
        print(f"✅ PDF generated: {len(pdf_bytes)} bytes")
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=contract-{contract_id}.pdf"}
        )
    except Exception as e:
        print(f"❌ PDF generation error: {str(e)}")
        logging.error(f"Error generating PDF: {str(e)}")
        import traceback
        print(traceback.format_exc())
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")

# ===== ADMIN ROUTES =====
@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user), search: str = None, include_deleted: bool = False):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    
    # По умолчанию не показываем удалённых пользователей
    if not include_deleted:
        query["is_deleted"] = {"$ne": True}
    
    # Добавляем поиск по ФИО, email, phone, ID  
    if search:
        search_pattern = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"full_name": search_pattern},
            {"email": search_pattern}, 
            {"phone": search_pattern},
            {"id": search},  # Точный поиск по ID
            {"company_name": search_pattern},
            {"iin": search_pattern}
        ]
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/debug/contracts-landlords")
async def debug_contracts_landlords(current_user: dict = Depends(get_current_user)):
    """Временный endpoint для отладки landlord_id в договорах"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Получить все уникальные landlord_id
    pipeline = [
        {"$group": {"_id": "$landlord_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    landlord_ids = await db.contracts.aggregate(pipeline).to_list(10)
    
    return {
        "message": "Top landlord IDs in contracts",
        "landlord_ids": landlord_ids
    }

@api_router.get("/admin/contracts")
async def get_all_contracts(
    current_user: dict = Depends(get_current_user),
    limit: int = 20,
    skip: int = 0,
    landlord_id: str = None,  # Фильтр по наймодателю  
    creator_id: str = None,   # Фильтр по создателю (для совместимости)
    search: str = None  # Поиск по contract_code, title
):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Базовый запрос исключающий удаленные договоры
    query = {
        "$or": [
            {"deleted": {"$exists": False}},  # Old contracts without deleted field
            {"deleted": False}  # New contracts that are not deleted
        ]
    }
    
    # Добавляем фильтр по landlord_id или creator_id
    if landlord_id:
        query["$and"] = query.get("$and", [])
        query["$and"].append({
            "$or": [
                {"landlord_id": landlord_id},
                {"creator_id": landlord_id}  # Поиск и по creator_id тоже
            ]
        })
    elif creator_id:
        query["creator_id"] = creator_id
    
    # Добавляем поиск только по contract_code и ID
    if search:
        query["$and"] = [
            query.get("$and", {}),
            {
                "$or": [
                    {"contract_code": {"$regex": search, "$options": "i"}},
                    {"id": search}  # Точный поиск по ID
                ]
            }
        ]
    
    # Получить договоры с пагинацией, отсортированные от новых к старым
    contracts = await db.contracts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Получить общее количество договоров
    total_count = await db.contracts.count_documents(query)
    
    return {
        "contracts": contracts,
        "total": total_count,
        "limit": limit,
        "skip": skip,
        "has_more": (skip + len(contracts)) < total_count
    }

@api_router.get("/admin/audit-logs")
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return logs

@api_router.get("/test-error")
async def test_error():
    """Тестовый endpoint для генерации ошибки"""
    import logging
    logging.error("TEST ERROR: This is a test error for modal testing")
    logging.error("TEST ERROR: Another error line for demonstration")
    raise HTTPException(status_code=500, detail="Test error generated")

@api_router.get("/admin/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Query для не удаленных договоров
    not_deleted_query = {
        "$or": [
            {"deleted": {"$exists": False}},
            {"deleted": False}
        ]
    }
    
    total_users = await db.users.count_documents({})
    total_contracts = await db.contracts.count_documents(not_deleted_query)
    
    # Подписанные договоры - считаем ВСЕ, включая удаленные (для статистики использования лимитов)
    signed_contracts = await db.contracts.count_documents({"status": "signed"})
    
    pending_contracts = await db.contracts.count_documents({
        **not_deleted_query,
        "status": "pending-signature"
    })
    
    # Online users (any activity in last 15 minutes) - count unique users
    fifteen_min_ago = datetime.now(timezone.utc) - timedelta(minutes=15)
    online_users_pipeline = [
        {"$match": {"timestamp": {"$gte": fifteen_min_ago.isoformat()}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "unique_users"}
    ]
    online_result = await db.user_logs.aggregate(online_users_pipeline).to_list(1)
    online_users = online_result[0]['unique_users'] if online_result else 0
    
    return {
        "total_users": total_users,
        "total_contracts": total_contracts,
        "signed_contracts": signed_contracts,
        "pending_contracts": pending_contracts,
        "online_users": online_users
    }

@api_router.get("/admin/users/{user_id}")
async def get_user_details(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Получить статистику по договорам пользователя
    user_contracts = await db.contracts.find({"landlord_id": user_id}).to_list(None)
    signed_count = sum(1 for c in user_contracts if c.get('status') == 'signed')
    pending_count = sum(1 for c in user_contracts if c.get('status') in ['draft', 'sent', 'pending-signature'])
    
    user['stats'] = {
        'total_contracts': len(user_contracts),
        'signed_contracts': signed_count,
        'pending_contracts': pending_count,
        'contract_limit': user.get('contract_limit', 3)
    }
    
    return user

@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, new_password: str, current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Хешируем новый пароль
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": password_hash}}
    )
    
    await log_audit("admin_password_reset", user_id=current_user.get('user_id'), 
                   details=f"Reset password for user: {user.get('email')}")
    
    # Log for admin
    await log_user_action(
        current_user['user_id'],
        "password_reset_admin",
        f"Вы сменили пароль пользователю {user.get('full_name')} ({user.get('email')})"
    )
    
    # Log for user
    await log_user_action(
        user_id,
        "password_reset_by_admin",
        f"Администратор сменил ваш пароль"
    )
    
    return {"message": "Password reset successfully", "new_password": new_password}

@api_router.post("/admin/users/{user_id}/update-contract-limit")
async def update_contract_limit(user_id: str, contract_limit: int, current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"contract_limit": contract_limit}}
    )
    
    await log_audit("admin_contract_limit_update", user_id=current_user.get('user_id'), 
                   details=f"Updated contract limit for {user.get('email')} to {contract_limit}")
    
    return {"message": "Contract limit updated successfully", "contract_limit": contract_limit}

@api_router.post("/admin/users/{user_id}/add-contracts")
async def add_contracts_to_limit(user_id: str, contracts_to_add: int, current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_limit = user.get('contract_limit', 3)
    new_limit = current_limit + contracts_to_add
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"contract_limit": new_limit}}
    )
    
    await log_audit("admin_contracts_added", user_id=current_user.get('user_id'), 
                   details=f"Added {contracts_to_add} contracts to {user.get('email')}. New limit: {new_limit}")
    
    return {
        "message": f"Added {contracts_to_add} contracts successfully",
        "previous_limit": current_limit,
        "new_limit": new_limit,
        "contracts_added": contracts_to_add
    }


@api_router.post("/admin/users/{user_id}/remove-contracts")
async def remove_contracts_from_limit(user_id: str, contracts_to_remove: int, current_user: dict = Depends(get_current_user)):
    """Отнять договора у пользователя"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_limit = user.get('contract_limit', 3)
    new_limit = max(0, current_limit - contracts_to_remove)  # Не меньше 0
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"contract_limit": new_limit}}
    )
    
    await log_audit("admin_contracts_removed", user_id=current_user.get('user_id'), 
                   details=f"Removed {contracts_to_remove} contracts from {user.get('email')}. New limit: {new_limit}")
    
    return {
        "message": f"Removed {contracts_to_remove} contracts successfully",
        "previous_limit": current_limit,
        "new_limit": new_limit,
        "contracts_removed": contracts_to_remove
    }


@api_router.post("/admin/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, current_user: dict = Depends(get_current_user)):
    """Активировать/деактивировать пользователя"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Нельзя деактивировать самого себя
    if user_id == current_user.get('user_id'):
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    current_status = user.get('is_active', True)
    new_status = not current_status
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": new_status}}
    )
    
    action = "activated" if new_status else "deactivated"
    await log_audit(f"admin_user_{action}", user_id=current_user.get('user_id'), 
                   details=f"User {user.get('email')} was {action}")
    
    return {
        "message": f"User {action} successfully",
        "is_active": new_status
    }


@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Полностью удалить пользователя из базы данных"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Нельзя удалить самого себя
    if user_id == current_user.get('user_id'):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    # Удаляем пользователя полностью
    await db.users.delete_one({"id": user_id})
    
    # Также удаляем все его договора
    await db.contracts.delete_many({"user_id": user_id})
    
    await log_audit("admin_user_deleted", user_id=current_user.get('user_id'), 
                   details=f"User {user.get('email')} was permanently deleted")
    
    return {"message": "User deleted successfully"}


# ==================== CONTRACT TEMPLATES ENDPOINTS ====================

@api_router.get("/templates")
async def get_templates(category: Optional[str] = None):
    """Получить список активных шаблонов (для маркетплейса)"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    templates = await db.contract_templates.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return templates

@api_router.get("/templates/{template_id}")
async def get_template(template_id: str):
    """Получить детали шаблона"""
    template = await db.contract_templates.find_one({"id": template_id, "is_active": True}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

# === Favorite Templates Endpoints ===

@api_router.post("/users/favorites/templates/{template_id}")
async def add_favorite_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Добавить шаблон в избранное"""
    user_id = current_user['user_id']
    
    # Проверить что шаблон существует
    template = await db.contract_templates.find_one({"id": template_id, "is_active": True})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Добавить в избранное (если еще не добавлен)
    result = await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"favorite_templates": template_id}}
    )
    
    await log_user_action(user_id, "template_favorited", f"Шаблон {template.get('title')} добавлен в избранное")
    
    return {"message": "Template added to favorites", "template_id": template_id}

@api_router.delete("/users/favorites/templates/{template_id}")
async def remove_favorite_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Удалить шаблон из избранного"""
    user_id = current_user['user_id']
    
    # Удалить из избранного
    result = await db.users.update_one(
        {"id": user_id},
        {"$pull": {"favorite_templates": template_id}}
    )
    
    return {"message": "Template removed from favorites", "template_id": template_id}

@api_router.get("/users/favorites/templates")
async def get_favorite_templates(current_user: dict = Depends(get_current_user)):
    """Получить список избранных шаблонов пользователя"""
    user_id = current_user['user_id']
    
    # Получить пользователя
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "favorite_templates": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    favorite_ids = user.get("favorite_templates", [])
    
    if not favorite_ids:
        return []
    
    # Получить шаблоны (не проверяем is_active, показываем все избранные)
    templates = await db.contract_templates.find(
        {"id": {"$in": favorite_ids}},
        {"_id": 0}
    ).to_list(100)
    
    return templates


@api_router.post("/admin/templates")
async def create_template(
    template: ContractTemplate,
    current_user: dict = Depends(get_current_user)
):
    """Создать новый шаблон (только админ)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    template_dict = template.model_dump()
    logging.info(f"🔍 Creating template: {template.title}, ID: {template.id}")
    logging.info(f"📝 Template dict keys: {list(template_dict.keys())}")
    logging.info(f"📏 Content lengths: RU={len(template_dict.get('content',''))}, KK={len(template_dict.get('content_kk',''))}, EN={len(template_dict.get('content_en',''))}")
    
    result = await db.contract_templates.insert_one(template_dict)
    logging.info(f"✅ Template inserted with _id: {result.inserted_id}")
    
    await log_audit("template_created", user_id=current_user['user_id'], 
                   details=f"Created template: {template.title}")
    
    return {"message": "Template created successfully", "template_id": template.id}

@api_router.put("/admin/templates/{template_id}")
async def update_template(
    template_id: str,
    template: ContractTemplate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить шаблон (только админ)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    template_dict = template.model_dump(exclude={'id'})  # Exclude ID to preserve original
    template_dict['updated_at'] = datetime.now(timezone.utc)
    
    result = await db.contract_templates.update_one(
        {"id": template_id},
        {"$set": template_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await log_audit("template_updated", user_id=current_user['user_id'], 
                   details=f"Updated template: {template_id}")
    
    return {"message": "Template updated successfully"}

@api_router.delete("/admin/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Удалить шаблон (только админ) - soft delete"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.contract_templates.update_one(
        {"id": template_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await log_audit("template_deleted", user_id=current_user['user_id'], 
                   details=f"Deleted template: {template_id}")
    
    return {"message": "Template deleted successfully"}

@api_router.get("/admin/templates")
async def get_all_templates(current_user: dict = Depends(get_current_user)):
    """Получить все шаблоны включая неактивные (только админ)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    templates = await db.contract_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return templates



# ==================== NOTIFICATIONS ====================

@api_router.post("/admin/notifications")
async def create_notification(
    notification: NotificationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать оповещение (только админ)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Deactivate all existing notifications
    await db.notifications.update_many(
        {"is_active": True},
        {"$set": {"is_active": False}}
    )
    
    # Create new notification
    new_notification = Notification(
        title=notification.title,
        message=notification.message,
        image_url=notification.image_url
    )
    
    await db.notifications.insert_one(new_notification.model_dump(by_alias=True))
    await log_audit("notification_created", details=f"Title: {notification.title}")
    
    return {"message": "Notification created", "notification": new_notification}

@api_router.get("/notifications/active")
async def get_active_notification(current_user: dict = Depends(get_current_user)):
    """Получить активное оповещение"""
    user_id = current_user['user_id']
    
    # Get active notification
    notification = await db.notifications.find_one(
        {"is_active": True},
        {"_id": 0}
    )
    
    if not notification:
        return None
    
    # Get user to check if already viewed
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "viewed_notifications": 1}
    )
    
    viewed_notifications = user.get("viewed_notifications", [])
    
    # If already viewed, return None
    if notification['id'] in viewed_notifications:
        return None
    
    return notification

@api_router.post("/notifications/{notification_id}/mark-viewed")
async def mark_notification_viewed(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Отметить оповещение как просмотренное"""
    user_id = current_user['user_id']
    
    await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"viewed_notifications": notification_id}}
    )
    
    return {"message": "Notification marked as viewed"}

@api_router.delete("/admin/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Удалить оповещение (только админ)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.notifications.delete_one({"id": notification_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await log_audit("notification_deleted", details=f"ID: {notification_id}")
    
    return {"message": "Notification deleted"}

@api_router.get("/admin/notifications")
async def get_all_notifications(current_user: dict = Depends(get_current_user)):
    """Получить все оповещения (только админ)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    notifications = await db.notifications.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return notifications  # ИСПРАВЛЕНО: добавлен return


# ==================== USER LOGS & SYSTEM METRICS ====================

@api_router.get("/admin/users/{user_id}/logs")
async def get_user_logs(
    user_id: str,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Получить логи конкретного пользователя (только админ)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1, "full_name": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user logs
    logs = await db.user_logs.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {
        "user": user,
        "logs": logs,
        "total": len(logs)
    }

@api_router.get("/admin/system/metrics")
async def get_system_metrics(current_user: dict = Depends(get_current_user)):
    """Получить системные метрики (только админ)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
    except Exception:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Always return a valid response, never 500
    try:
        # Default values
        cpu_percent = 0
        memory_info = {"total_gb": 0, "used_gb": 0, "available_gb": 0, "percent": 0}
        disk_info = {"total_gb": 0, "used_gb": 0, "free_gb": 0, "percent": 0}
        uptime_days = 0
        uptime_hours = 0
        uptime_seconds = 0
        network_stats = None
        recent_errors = []
        db_info = {"size_mb": 0, "collections": 0, "indexes": 0}
        active_users_count = 0
        online_users_count = 0
        status = "healthy"
        
        # System metrics (only if psutil is available)
        if PSUTIL_AVAILABLE and psutil:
            try:
                cpu_percent = psutil.cpu_percent(interval=0.1) or 0
            except Exception:
                pass
            
            try:
                memory = psutil.virtual_memory()
                memory_info = {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "used_gb": round(memory.used / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "percent": memory.percent
                }
            except Exception:
                pass
            
            try:
                disk = psutil.disk_usage('/')
                disk_info = {
                    "total_gb": round(disk.total / (1024**3), 2),
                    "used_gb": round(disk.used / (1024**3), 2),
                    "free_gb": round(disk.free / (1024**3), 2),
                    "percent": disk.percent
                }
            except Exception:
                pass
            
            try:
                boot_time = psutil.boot_time()
                uptime_seconds = time.time() - boot_time
                uptime_days = int(uptime_seconds // 86400)
                uptime_hours = int((uptime_seconds % 86400) // 3600)
            except Exception:
                pass
            
            try:
                net_io = psutil.net_io_counters()
                network_stats = {
                    "bytes_sent": net_io.bytes_sent,
                    "bytes_recv": net_io.bytes_recv,
                    "packets_sent": net_io.packets_sent,
                    "packets_recv": net_io.packets_recv
                }
            except Exception:
                pass
        else:
            status = "limited"  # psutil not available
        
        # Recent errors from logs
        try:
            log_paths = [
                '/var/log/supervisor/backend.err.log',
                '/var/log/backend.err.log',
                'backend.err.log'
            ]
            for log_path in log_paths:
                try:
                    with open(log_path, 'r') as f:
                        error_lines = f.readlines()[-100:]
                        recent_errors = [line.strip() for line in error_lines if 'ERROR' in line or 'Exception' in line][-20:]
                        break
                except (FileNotFoundError, PermissionError):
                    continue
        except Exception:
            pass
        
        # Database stats
        try:
            db_stats = await db.command("dbStats")
            db_info = {
                "size_mb": round(db_stats.get('dataSize', 0) / (1024**2), 2),
                "collections": db_stats.get('collections', 0),
                "indexes": db_stats.get('indexes', 0)
            }
        except Exception:
            pass
        
        # Active users (logged in last 24h)
        try:
            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            active_users_count = await db.user_logs.count_documents({
                "action": "login_success",
                "timestamp": {"$gte": yesterday.isoformat()}
            })
        except Exception:
            pass
        
        # Online users (any activity in last 15 minutes)
        try:
            fifteen_min_ago = datetime.now(timezone.utc) - timedelta(minutes=15)
            online_pipeline = [
                {"$match": {"timestamp": {"$gte": fifteen_min_ago.isoformat()}}},
                {"$group": {"_id": "$user_id"}},
                {"$count": "unique_users"}
            ]
            online_result = await db.user_logs.aggregate(online_pipeline).to_list(1)
            online_users_count = online_result[0]['unique_users'] if online_result else 0
        except Exception:
            pass
        
        return {
            "status": status,
            "cpu_percent": cpu_percent,
            "memory": memory_info,
            "disk": disk_info,
            "uptime": {
                "days": uptime_days,
                "hours": uptime_hours,
                "total_seconds": int(uptime_seconds)
            },
            "network": network_stats,
            "database": db_info,
            "active_users_24h": active_users_count,
            "online_users": online_users_count,
            "recent_errors": recent_errors[-20:] if recent_errors else []
        }
    except Exception as e:
        # Absolute fallback - NEVER return 500
        return {
            "status": "error",
            "cpu_percent": 0,
            "memory": {"total_gb": 0, "used_gb": 0, "available_gb": 0, "percent": 0},
            "disk": {"total_gb": 0, "used_gb": 0, "free_gb": 0, "percent": 0},
            "uptime": {"days": 0, "hours": 0, "total_seconds": 0},
            "network": None,
            "database": {"size_mb": 0, "collections": 0, "indexes": 0},
            "active_users_24h": 0,
            "online_users": 0,
            "recent_errors": [f"Metrics error: {str(e)}"]
        }


    
    return notifications

@api_router.post("/admin/notifications/upload-image")
async def upload_notification_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Загрузить картинку для оповещения"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate image
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files allowed")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1]
    filename = f"notification_{uuid.uuid4()}.{ext}"
    filepath = f"/app/uploads/notifications/{filename}"
    
    # Create directory if not exists
    os.makedirs("/app/uploads/notifications", exist_ok=True)
    
    # Save file
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Return URL
    image_url = f"/uploads/notifications/{filename}"
    
    return {"image_url": image_url}


# ==================== FREEDOMPAY PAYMENT INTEGRATION ====================

# FreedomPay Configuration
FREEDOMPAY_MERCHANT_ID = os.environ.get('FREEDOMPAY_MERCHANT_ID', '581401')
FREEDOMPAY_SECRET_KEY = os.environ.get('FREEDOMPAY_SECRET_KEY', 'h8pdepQhoWNM0bGT')
FREEDOMPAY_API_URL = 'https://api.freedompay.kz'
FREEDOMPAY_TESTING_MODE = os.environ.get('FREEDOMPAY_TESTING_MODE', '1')  # 1 = test, 0 = live

def generate_freedompay_signature(script_name: str, params: dict, secret_key: str) -> str:
    """Generate FreedomPay signature (pg_sig)
    
    Signature is MD5 hash of: script_name;param1_value;param2_value;...;secret_key
    Parameters are sorted alphabetically by key name
    """
    # Sort params alphabetically by key (only params starting with pg_)
    sorted_keys = sorted([k for k in params.keys() if k.startswith('pg_') and k != 'pg_sig'])
    values = [script_name]
    for key in sorted_keys:
        values.append(str(params[key]))
    values.append(secret_key)
    
    sign_string = ';'.join(values)
    logging.debug(f"Signature string: {sign_string}")
    return hashlib.md5(sign_string.encode('utf-8')).hexdigest()

def verify_freedompay_signature(script_name: str, params: dict, signature: str, secret_key: str) -> bool:
    """Verify FreedomPay callback signature"""
    calculated_sig = generate_freedompay_signature(script_name, params, secret_key)
    return calculated_sig == signature

class PaymentCreate(BaseModel):
    plan_id: str  # 'start', 'business', 'custom_template', 'custom_contracts'
    amount: int
    auto_renewal: bool = False
    custom_contracts_count: Optional[int] = None  # For custom_contracts plan

class Payment(BaseModel):
    """Payment record in database"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plan_id: str
    amount: int
    currency: str = "KZT"
    status: str = "pending"  # pending, success, failed, refunded
    pg_payment_id: Optional[str] = None
    pg_order_id: str = ""
    auto_renewal: bool = False
    custom_contracts_count: Optional[int] = None  # For custom_contracts plan
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

class Subscription(BaseModel):
    """User subscription"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plan_id: str  # 'free', 'start', 'business', 'custom_template', 'custom_contracts'
    status: str = "active"  # active, expired, cancelled
    contract_limit: int = 3
    auto_renewal: bool = False
    is_permanent: bool = False  # True for custom_contracts (no monthly reset)
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    payment_id: Optional[str] = None

class CustomTemplateRequest(BaseModel):
    """Request for custom/individual contract template"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: str = "pending"  # pending, paid, in_progress, completed, cancelled
    description: str = ""  # User's description of what they need
    uploaded_document: Optional[str] = None  # Base64 of uploaded document
    uploaded_document_filename: Optional[str] = None
    assigned_template_id: Optional[str] = None  # Template ID when completed
    payment_id: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

# Plan configuration
# Pricing: 5990/20 = ~300 per contract, with volume discount
# custom_contracts: 250₸ per contract base, discount after 50
TARIFF_PLANS = {
    'free': {'contracts': 3, 'price': 0, 'monthly': True},
    'start': {'contracts': 20, 'price': 5990, 'monthly': True},
    'business': {'contracts': 50, 'price': 14990, 'monthly': True},
    'custom_template': {'contracts': 0, 'price': 29990, 'monthly': False},  # One-time payment for custom template
}

# Custom contracts pricing calculator
def calculate_custom_contracts_price(count: int) -> dict:
    """Calculate price for custom contracts package (no monthly reset)"""
    if count < 20:
        return {"error": "Minimum 20 contracts required"}
    
    base_price_per_contract = 250  # Base price per contract
    
    if count <= 50:
        # No discount for 20-50
        total = count * base_price_per_contract
        return {"count": count, "price": total, "discount": 0, "price_per_contract": base_price_per_contract}
    else:
        # Discount after 50 contracts: 10% off = 225₸ per contract
        discount_price = 225
        # First 50 at full price, rest at discount
        total_full = 50 * base_price_per_contract
        total_discount = (count - 50) * discount_price
        total = total_full + total_discount
        discount_amount = (count - 50) * (base_price_per_contract - discount_price)
        avg_price = total / count
        return {
            "count": count, 
            "price": total, 
            "discount": discount_amount,
            "price_per_contract": round(avg_price),
            "discount_info": f"Скидка 25₸ на каждый договор после 50-го (экономия {discount_amount}₸)"
        }

@api_router.post("/payment/create")
async def create_payment(
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create payment and get FreedomPay redirect URL"""
    import httpx
    
    # Handle custom_contracts plan separately
    if payment_data.plan_id == 'custom_contracts':
        if not payment_data.custom_contracts_count or payment_data.custom_contracts_count < 20:
            raise HTTPException(status_code=400, detail="Minimum 20 contracts required for custom plan")
        
        pricing = calculate_custom_contracts_price(payment_data.custom_contracts_count)
        if "error" in pricing:
            raise HTTPException(status_code=400, detail=pricing["error"])
        
        amount = pricing["price"]
        contracts_count = pricing["count"]
    else:
        plan = TARIFF_PLANS.get(payment_data.plan_id)
        if not plan:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        if plan['price'] == 0:
            raise HTTPException(status_code=400, detail="Free plan doesn't require payment")
        
        amount = plan['price']
        contracts_count = payment_data.custom_contracts_count
    
    # Create payment record
    payment = Payment(
        user_id=current_user['user_id'],
        plan_id=payment_data.plan_id,
        amount=amount,
        auto_renewal=payment_data.auto_renewal,
        custom_contracts_count=contracts_count if payment_data.plan_id == 'custom_contracts' else None,
        pg_order_id=f"2tick_{current_user['user_id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    )
    
    payment_dict = payment.model_dump()
    payment_dict['created_at'] = payment_dict['created_at'].isoformat() if payment_dict.get('created_at') else None
    await db.payments.insert_one(payment_dict)
    
    # Prepare FreedomPay request
    pg_salt = str(uuid.uuid4())[:16]
    
    # Get APP_URL for callbacks
    app_url = os.environ.get('APP_URL', 'https://2tick.kz')
    
    # Plan description
    plan_names = {
        'start': 'Тариф START - 20 договоров/месяц',
        'business': 'Тариф BUSINESS - 50 договоров/месяц',
        'custom_template': 'Индивидуальный договор',
        'custom_contracts': f'Пакет {contracts_count} договоров'
    }
    
    params = {
        'pg_merchant_id': FREEDOMPAY_MERCHANT_ID,
        'pg_order_id': payment.pg_order_id,
        'pg_amount': str(amount),
        'pg_currency': 'KZT',
        'pg_description': plan_names.get(payment_data.plan_id, f'Подписка {payment_data.plan_id}'),
        'pg_salt': pg_salt,
        'pg_testing_mode': FREEDOMPAY_TESTING_MODE,
        'pg_result_url': f'{app_url}/api/payment/result',
        'pg_success_url': f'{app_url}/payment/success',
        'pg_failure_url': f'{app_url}/payment/failure',
        'pg_language': 'ru',
        'pg_user_id': current_user['user_id'],
    }
    
    # Generate signature
    params['pg_sig'] = generate_freedompay_signature('init_payment.php', params, FREEDOMPAY_SECRET_KEY)
    
    logging.info(f"FreedomPay request params: {params}")
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                f'{FREEDOMPAY_API_URL}/init_payment.php',
                data=params,
                timeout=30.0
            )
            
            logging.info(f"FreedomPay response: {response.text}")
            
            # Parse XML response
            import xml.etree.ElementTree as ET
            root = ET.fromstring(response.text)
            
            pg_status = root.find('pg_status')
            if pg_status is not None and pg_status.text == 'ok':
                pg_redirect_url = root.find('pg_redirect_url')
                pg_payment_id = root.find('pg_payment_id')
                
                if pg_redirect_url is not None:
                    # Update payment with pg_payment_id
                    if pg_payment_id is not None:
                        await db.payments.update_one(
                            {"id": payment.id},
                            {"$set": {"pg_payment_id": pg_payment_id.text}}
                        )
                    
                    return {
                        "payment_id": payment.id,
                        "payment_url": pg_redirect_url.text
                    }
            
            # Error handling
            pg_error_description = root.find('pg_error_description')
            error_msg = pg_error_description.text if pg_error_description is not None else 'Payment initialization failed'
            
            await db.payments.update_one(
                {"id": payment.id},
                {"$set": {"status": "failed"}}
            )
            
            raise HTTPException(status_code=400, detail=error_msg)
            
    except httpx.RequestError as e:
        logging.error(f"FreedomPay request error: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment service unavailable")

@api_router.post("/payment/result")
async def payment_result(request: Request):
    """FreedomPay webhook callback (Result URL)"""
    # Get form data
    form_data = await request.form()
    params = dict(form_data)
    
    logging.info(f"Payment result callback: {params}")
    
    # Verify signature
    pg_sig = params.get('pg_sig', '')
    if not verify_freedompay_signature('result', params, pg_sig, FREEDOMPAY_SECRET_KEY):
        logging.error("Invalid signature in payment callback")
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><response><pg_status>error</pg_status><pg_description>Invalid signature</pg_description></response>',
            media_type="application/xml"
        )
    
    pg_order_id = params.get('pg_order_id', '')
    pg_result = params.get('pg_result', '')
    pg_payment_id = params.get('pg_payment_id', '')
    
    # Find payment
    payment = await db.payments.find_one({"pg_order_id": pg_order_id})
    if not payment:
        logging.error(f"Payment not found: {pg_order_id}")
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><response><pg_status>error</pg_status><pg_description>Order not found</pg_description></response>',
            media_type="application/xml"
        )
    
    if pg_result == '1':  # Success
        # Activate subscription
        plan = TARIFF_PLANS.get(payment['plan_id'])
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        # Create or update subscription
        subscription = Subscription(
            user_id=payment['user_id'],
            plan_id=payment['plan_id'],
            contract_limit=plan['contracts'],
            auto_renewal=payment.get('auto_renewal', False),
            expires_at=expires_at,
            payment_id=payment['id']
        )
        
        sub_dict = subscription.model_dump()
        sub_dict['started_at'] = sub_dict['started_at'].isoformat() if sub_dict.get('started_at') else None
        sub_dict['expires_at'] = sub_dict['expires_at'].isoformat() if sub_dict.get('expires_at') else None
        
        # Upsert subscription
        await db.subscriptions.update_one(
            {"user_id": payment['user_id']},
            {"$set": sub_dict},
            upsert=True
        )
        
        # Update user's contract limit
        await db.users.update_one(
            {"id": payment['user_id']},
            {"$set": {"contract_limit": plan['contracts']}}
        )
        
        # Update payment status
        await db.payments.update_one(
            {"id": payment['id']},
            {"$set": {
                "status": "success",
                "pg_payment_id": pg_payment_id,
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": expires_at.isoformat()
            }}
        )
        
        await log_audit("payment_success", user_id=payment['user_id'], 
                       details=f"Plan: {payment['plan_id']}, Amount: {payment['amount']} KZT")
        
        logging.info(f"Payment successful: {pg_order_id}")
        
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><response><pg_status>ok</pg_status><pg_description>Payment accepted</pg_description></response>',
            media_type="application/xml"
        )
    else:  # Failed
        await db.payments.update_one(
            {"id": payment['id']},
            {"$set": {"status": "failed", "pg_payment_id": pg_payment_id}}
        )
        
        await log_audit("payment_failed", user_id=payment['user_id'], 
                       details=f"Plan: {payment['plan_id']}, Order: {pg_order_id}")
        
        logging.info(f"Payment failed: {pg_order_id}")
        
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><response><pg_status>ok</pg_status><pg_description>Failure recorded</pg_description></response>',
            media_type="application/xml"
        )

@api_router.post("/payment/check")
async def payment_check(request: Request):
    """FreedomPay check URL callback"""
    form_data = await request.form()
    params = dict(form_data)
    
    logging.info(f"Payment check callback: {params}")
    
    pg_order_id = params.get('pg_order_id', '')
    
    # Find payment
    payment = await db.payments.find_one({"pg_order_id": pg_order_id})
    if not payment:
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><response><pg_status>rejected</pg_status><pg_description>Order not found</pg_description></response>',
            media_type="application/xml"
        )
    
    # Check if already paid
    if payment.get('status') == 'success':
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><response><pg_status>rejected</pg_status><pg_description>Already paid</pg_description></response>',
            media_type="application/xml"
        )
    
    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?><response><pg_status>ok</pg_status><pg_description>Check passed</pg_description></response>',
        media_type="application/xml"
    )

@api_router.get("/payment/status/{payment_id}")
async def get_payment_status(
    payment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get payment status"""
    payment = await db.payments.find_one({
        "id": payment_id,
        "user_id": current_user['user_id']
    })
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {
        "id": payment['id'],
        "status": payment['status'],
        "plan_id": payment['plan_id'],
        "amount": payment['amount'],
        "created_at": payment.get('created_at'),
        "paid_at": payment.get('paid_at')
    }

@api_router.get("/payment/history")
async def get_payment_history(current_user: dict = Depends(get_current_user)):
    """Get user's payment history"""
    payments = await db.payments.find(
        {"user_id": current_user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return payments

@api_router.get("/subscriptions/current")
async def get_current_subscription(current_user: dict = Depends(get_current_user)):
    """Get user's current subscription"""
    subscription = await db.subscriptions.find_one({"user_id": current_user['user_id']})
    
    if not subscription:
        # Return free plan by default
        return {
            "plan_id": "free",
            "status": "active",
            "contract_limit": 3,
            "auto_renewal": False,
            "expires_at": None
        }
    
    # Check if expired
    if subscription.get('expires_at'):
        expires_at = subscription['expires_at']
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        
        if expires_at < datetime.now(timezone.utc):
            # Expired - revert to free
            await db.subscriptions.update_one(
                {"user_id": current_user['user_id']},
                {"$set": {"status": "expired"}}
            )
            await db.users.update_one(
                {"id": current_user['user_id']},
                {"$set": {"contract_limit": 3}}
            )
            return {
                "plan_id": "free",
                "status": "expired",
                "contract_limit": 3,
                "auto_renewal": False,
                "expires_at": subscription.get('expires_at')
            }
    
    return {
        "plan_id": subscription.get('plan_id', 'free'),
        "status": subscription.get('status', 'active'),
        "contract_limit": subscription.get('contract_limit', 3),
        "auto_renewal": subscription.get('auto_renewal', False),
        "expires_at": subscription.get('expires_at'),
        "started_at": subscription.get('started_at')
    }

@api_router.post("/subscriptions/toggle-auto-renewal")
async def toggle_auto_renewal(current_user: dict = Depends(get_current_user)):
    """Toggle auto-renewal for subscription"""
    subscription = await db.subscriptions.find_one({"user_id": current_user['user_id']})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription")
    
    new_value = not subscription.get('auto_renewal', False)
    
    await db.subscriptions.update_one(
        {"user_id": current_user['user_id']},
        {"$set": {"auto_renewal": new_value}}
    )
    
    return {"auto_renewal": new_value}

# Backward compatibility endpoint
@api_router.post("/subscriptions/create-payment")
async def create_subscription_payment(
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Alias for /payment/create for backward compatibility"""
    return await create_payment(payment_data, current_user)


# ==================== UPLOAD PDF CONTRACT ====================

@api_router.post("/contracts/upload-pdf")
async def upload_pdf_contract(
    file: UploadFile = File(...),
    title: str = Form(...),
    # Party A fields (from user profile)
    landlord_name: str = Form(""),
    landlord_iin: str = Form(""),
    landlord_phone: str = Form(""),
    landlord_email: str = Form(""),
    landlord_address: str = Form(""),
    # Party B fields (optional - can be filled later by signer)
    signer_name: str = Form(""),
    signer_email: str = Form(""),
    signer_phone: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    """Загрузить готовый PDF договор для подписания.
    Работает так же как шаблонные контракты:
    1. Сторона А заполняет свои данные и загружает PDF
    2. Контракт создаётся со статусом "draft"
    3. Сторона А копирует ссылку и отправляет Стороне Б
    4. Сторона Б открывает ссылку, просматривает PDF, загружает удостоверение, верифицируется
    5. Сторона А утверждает контракт
    """
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Validate file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")
    
    # Check contract limit
    user = await db.users.find_one({"id": current_user['user_id']})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    contract_limit = user.get('contract_limit', 3)
    user_contracts = await db.contracts.count_documents({"creator_id": current_user['user_id']})
    
    if user_contracts >= contract_limit:
        raise HTTPException(
            status_code=403, 
            detail="Лимит договоров исчерпан. Пожалуйста, обновите тариф для создания новых договоров."
        )
    
    # Save file to server
    upload_dir = "/app/backend/uploaded_contracts"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    file_path = f"{upload_dir}/{file_id}.pdf"
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Use provided landlord data or fall back to user profile
    final_landlord_name = landlord_name or user.get('company_name', '') or user.get('full_name', '')
    final_landlord_email = landlord_email or user.get('email', '')
    final_landlord_phone = landlord_phone or user.get('phone', '')
    final_landlord_iin = landlord_iin or user.get('iin', '')
    final_landlord_address = landlord_address or user.get('legal_address', '')
    
    # Create contract with status "draft" (like template contracts)
    contract = Contract(
        title=title,
        content="",  # Empty for uploaded PDF - PDF file is used instead
        content_type="plain",
        creator_id=current_user['user_id'],
        source_type="uploaded_pdf",
        uploaded_pdf_path=file_path,
        # Party B data (can be empty - signer will fill during signing)
        signer_name=signer_name or "",
        signer_email=signer_email or "",
        signer_phone=signer_phone or "",
        # Status "draft" - same flow as template contracts
        status="draft",
        # Party A data
        landlord_name=final_landlord_name,
        landlord_email=final_landlord_email,
        landlord_full_name=user.get('full_name', ''),
        landlord_iin_bin=final_landlord_iin,
        landlord_phone=final_landlord_phone,
        landlord_address=final_landlord_address,
        contract_number="PDF-" + str(uuid.uuid4())[:8].upper(),
        contract_code=generate_contract_code()
    )
    
    contract_dict = contract.model_dump()
    await db.contracts.insert_one(contract_dict)
    
    # Generate signature link
    signature_link = f"/sign/{contract.id}"
    await db.contracts.update_one(
        {"id": contract.id},
        {"$set": {"signature_link": signature_link}}
    )
    
    await log_audit("pdf_contract_uploaded", user_id=current_user['user_id'], 
                   contract_id=contract.id, details=f"Uploaded PDF: {title}")
    
    return {
        "message": "PDF uploaded successfully",
        "contract_id": contract.id,
        "signature_link": signature_link
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
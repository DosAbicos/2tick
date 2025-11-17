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
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'signify-kz-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_VERIFY_SERVICE_SID = os.environ.get('TWILIO_VERIFY_SERVICE_SID')
TWILIO_PROXY_SERVICE_SID = os.environ.get('TWILIO_PROXY_SERVICE_SID')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

# SendGrid Configuration
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@2tick.kz')

# SMTP Configuration (primary)
USE_SMTP = os.environ.get('USE_SMTP', 'false').lower() == 'true'
SMTP_HOST = os.environ.get('SMTP_HOST', 'mail.2tick.kz')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '25'))
SMTP_USER = os.environ.get('SMTP_USER', 'noreply@2tick.kz')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_BOT_USERNAME = os.environ.get('TELEGRAM_BOT_USERNAME', 'twotick_bot')

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logging.info("✅ Twilio client initialized successfully")
    except Exception as e:
        logging.error(f"❌ Failed to initialize Twilio client: {str(e)}")
else:
    logging.warning("⚠️ Twilio credentials not found, SMS will be mocked")

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
    contract_limit: int = 5  # Лимит на количество договоров (по умолчанию 5)
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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

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
    description: str
    category: str  # "real_estate", "services", "employment", "other"
    content: str
    content_type: str = "plain"  # "plain" or "html"
    placeholders: Optional[dict] = None  # Конфигурация плейсхолдеров
    requires_tenant_document: bool = False  # Требуется ли удостоверение нанимателя
    is_active: bool = True
    created_by: str = "admin"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
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
    approved_at: Optional[datetime] = None
    landlord_name: Optional[str] = None  # Название компании
    landlord_email: Optional[str] = None  # Email наймодателя
    landlord_full_name: Optional[str] = None  # ФИО наймодателя
    landlord_representative: Optional[str] = None  # Представитель (кто составил)
    landlord_iin_bin: Optional[str] = None  # ИИН/БИН из профиля
    verification_method: Optional[str] = None  # SMS, Call, Telegram
    telegram_username: Optional[str] = None  # @username для Telegram верификации
    signature: Optional[dict] = None  # Signature data (document_upload, verified status)
    tenant_document: Optional[str] = None  # Удостоверение нанимателя (base64 или путь)
    tenant_document_filename: Optional[str] = None  # Имя файла удостоверения
    deleted: bool = False  # Soft delete flag - для подписанных договоров
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContractCreate(BaseModel):
    title: str
    content: str
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

def send_otp_via_twilio(phone: str, channel: str = "sms") -> dict:
    """Send OTP via Twilio Verify API
    
    Args:
        phone: Phone number in international format
        channel: 'sms' or 'call'
    
    Returns:
        dict with 'success' bool and 'message' or 'error'
    """
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        # Fallback to mock
        otp = generate_otp()
        logging.warning(f"[MOCK] Twilio not configured. OTP: {otp} for {phone}")
        return {"success": True, "message": "Mock OTP sent", "mock_otp": otp}
    
    try:
        phone = normalize_phone(phone)
        verification = twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verifications.create(
            to=phone,
            channel=channel  # 'sms' or 'call'
        )
        
        logging.info(f"✅ Twilio OTP sent to {phone} via {channel}. Status: {verification.status}")
        return {"success": True, "message": f"OTP sent via {channel}", "status": verification.status}
    
    except TwilioRestException as e:
        logging.error(f"❌ Twilio error: {e.msg}")
        
        # Handle trial account limitations and authentication errors - fallback to mock
        if ("unverified" in str(e.msg).lower() or 
            "trial account" in str(e.msg).lower() or 
            "authenticate" in str(e.msg).lower()):
            otp = generate_otp()
            logging.warning(f"[MOCK FALLBACK] Twilio error ({e.msg}). OTP: {otp} for {phone}")
            return {"success": True, "message": "Mock OTP sent (Twilio fallback)", "mock_otp": otp}
        
        return {"success": False, "error": str(e.msg)}
    except Exception as e:
        logging.error(f"❌ Error sending OTP: {str(e)}")
        return {"success": False, "error": str(e)}

def verify_otp_via_twilio(phone: str, code: str) -> dict:
    """Verify OTP via Twilio Verify API
    
    Args:
        phone: Phone number in international format
        code: OTP code to verify
    
    Returns:
        dict with 'success' bool and 'status' or 'error'
    """
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        # Fallback to mock (always approve for testing)
        logging.warning(f"[MOCK] Twilio not configured. Accepting OTP: {code}")
        return {"success": True, "status": "approved"}
    
    try:
        phone = normalize_phone(phone)
        verification_check = twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verification_checks.create(
            to=phone,
            code=code
        )
        
        logging.info(f"✅ Twilio OTP verification for {phone}. Status: {verification_check.status}")
        
        if verification_check.status == "approved":
            return {"success": True, "status": "approved"}
        else:
            return {"success": False, "error": "Invalid or expired OTP", "status": verification_check.status}
    
    except TwilioRestException as e:
        logging.error(f"❌ Twilio verification error: {e.msg}")
        
        # Handle trial account limitations and authentication errors - fallback to mock verification
        if ("unverified" in str(e.msg).lower() or 
            "trial account" in str(e.msg).lower() or 
            "authenticate" in str(e.msg).lower()):
            logging.warning(f"[MOCK FALLBACK] Twilio error ({e.msg}). Accepting OTP: {code}")
            return {"success": True, "status": "approved"}
        
        return {"success": False, "error": str(e.msg)}
    except Exception as e:
        logging.error(f"❌ Error verifying OTP: {str(e)}")
        return {"success": False, "error": str(e)}

def send_sms(phone: str, message: str) -> bool:
    """Legacy mocked SMS sending (kept for backward compatibility)"""
    logging.info(f"[MOCK SMS] To: {phone} | Message: {message}")
    return True

def make_call(phone: str, code: str) -> bool:
    """Legacy mocked voice call (kept for backward compatibility)"""
    logging.info(f"[MOCK CALL] To: {phone} | Code: {code}")
    return True

def send_email(to_email: str, subject: str, body: str, attachment: bytes = None, filename: str = None) -> bool:
    """Send email via SMTP (primary) or SendGrid (fallback)"""
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
                    
                    # Reduced timeout from 10 to 5 seconds for faster failure
                    if use_tls == 'SSL':
                        # SSL connection (port 465)
                        import ssl
                        context = ssl.create_default_context()
                        server = smtplib.SMTP_SSL(SMTP_HOST, port, context=context, timeout=5)
                    else:
                        # Regular connection
                        server = smtplib.SMTP(SMTP_HOST, port, timeout=5)
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
                # Fall through to SendGrid
                
        except Exception as e:
            print(f"❌ SMTP error: {str(e)}")
            logging.error(f"SMTP error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            # Fall through to SendGrid
    
    # Fallback to SendGrid
    print(f"🔥 DEBUG: Falling back to SendGrid")
    if not SENDGRID_API_KEY:
        logging.warning("[MOCK EMAIL] No email service configured")
        return True
    
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
        import base64
        
        message = Mail(
            from_email=SENDER_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=body
        )
        
        if attachment and filename:
            encoded_file = base64.b64encode(attachment).decode()
            attached_file = Attachment(
                FileContent(encoded_file),
                FileName(filename),
                FileType('application/pdf'),
                Disposition('attachment')
            )
            message.attachment = attached_file
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        if response.status_code in [200, 202]:
            logging.info(f"✅ SendGrid email sent to {to_email}")
            return True
        else:
            logging.error(f"❌ SendGrid failed: {response.status_code}")
            return False
            
    except Exception as e:
        logging.error(f"❌ SendGrid error: {str(e)}")
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

def generate_contract_pdf(contract: dict, signature: dict = None, landlord_signature_hash: str = None, landlord: dict = None) -> bytes:
    """Generate full PDF for contract with all content and signatures"""
    
    # Register fonts
    try:
        dejavu_path = '/usr/share/fonts/truetype/dejavu/'
        pdfmetrics.registerFont(TTFont('DejaVu', dejavu_path + 'DejaVuSans.ttf'))
        pdfmetrics.registerFont(TTFont('DejaVu-Bold', dejavu_path + 'DejaVuSans-Bold.ttf'))
        pdfmetrics.registerFont(TTFont('DejaVu-Mono', dejavu_path + 'DejaVuSansMono.ttf'))
    except:
        pass
    
    # Create PDF
    pdf_buffer = BytesIO()
    p = canvas.Canvas(pdf_buffer, pagesize=A4)
    width, height = A4
    
    # Title
    try:
        p.setFont("DejaVu-Bold", 16)
    except:
        p.setFont("Helvetica-Bold", 16)
    
    title_text = contract['title']
    p.drawString(50, height - 50, title_text[:60])
    
    # Date
    try:
        p.setFont("DejaVu", 10)
    except:
        p.setFont("Helvetica", 10)
    
    p.drawString(50, height - 80, f"Договор подписан {datetime.now().strftime('%d.%m.%Y')}")
    
    y_position = height - 120
    
    # Content with DejaVu font
    try:
        p.setFont("DejaVu", 9)
    except:
        p.setFont("Helvetica", 9)
    
    # Convert HTML to text if needed and replace placeholders
    try:
        content_text = contract['content']
        
        # Graceful fallback for missing content_type
        content_type = contract.get('content_type', 'plain')
        
        if content_type == 'html':
            content_text = html_to_text_for_pdf(content_text)
        
        # Replace placeholders with actual values
        content_text = replace_placeholders_in_content(content_text, contract)
    except Exception as e:
        logging.error(f"Error processing content: {str(e)}")
        content_text = contract.get('content', 'Error loading content')
    
    lines = content_text.split('\n')
    
    for line in lines:
        if y_position < 100:
            p.showPage()
            try:
                p.setFont("DejaVu", 9)
            except:
                p.setFont("Helvetica", 9)
            y_position = height - 50
        
        if len(line) > 100:
            words = line.split()
            current_line = ""
            for word in words:
                if len(current_line + word) < 100:
                    current_line += word + " "
                else:
                    if current_line.strip():
                        p.drawString(50, y_position, current_line.strip())
                        y_position -= 12
                    current_line = word + " "
            if current_line.strip():
                p.drawString(50, y_position, current_line.strip())
                y_position -= 12
        else:
            if line.strip():
                p.drawString(50, y_position, line.strip())
                y_position -= 12
    
    # Add ID document photo if available
    if signature and signature.get('document_upload'):
        y_position -= 40
        
        # Check if we need a new page for the image
        if y_position < 450:  # Need at least 450px for image section
            p.showPage()
            y_position = height - 50
        
        try:
            p.setFont("DejaVu-Bold", 12)
        except:
            p.setFont("Helvetica-Bold", 12)
        
        p.drawString(50, y_position, "Удостоверение личности:")
        y_position -= 30
        
        try:
            # Decode base64 image
            import base64
            from PIL import Image
            
            doc_data = signature['document_upload']
            if doc_data.startswith('data:'):
                doc_data = doc_data.split(',')[1]
            
            image_bytes = base64.b64decode(doc_data)
            image = Image.open(BytesIO(image_bytes))
            
            # Resize image to fit PDF (max 450px wide, 350px height)
            max_width = 450
            max_height = 350
            
            # Calculate aspect ratio
            img_ratio = float(image.size[0]) / float(image.size[1])
            
            if img_ratio > (max_width / max_height):
                # Width is limiting factor
                new_width = max_width
                new_height = int(max_width / img_ratio)
            else:
                # Height is limiting factor
                new_height = max_height
                new_width = int(max_height * img_ratio)
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize image
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save to buffer with HIGH quality
            img_buffer = BytesIO()
            image.save(img_buffer, format='JPEG', quality=95, optimize=False)
            img_buffer.seek(0)
            
            # Draw image - position from TOP-LEFT corner
            # y_position is TOP of image area, so subtract height to get BOTTOM
            img_bottom = y_position - new_height
            
            # Make sure image fits on page
            if img_bottom < 50:
                p.showPage()
                y_position = height - 50
                img_bottom = y_position - new_height
            
            img_reader = ImageReader(img_buffer)
            p.drawImage(
                img_reader, 
                50,  # x position (left margin)
                img_bottom,  # y position (bottom of image)
                width=new_width, 
                height=new_height,
                preserveAspectRatio=True
            )
            
            # Move position down below image
            y_position = img_bottom - 20
            
            logging.info(f"✅ ID document image added to PDF: {new_width}x{new_height}px")
            
        except Exception as e:
            logging.error(f"Error adding document image to PDF: {str(e)}")
            import traceback
            logging.error(traceback.format_exc())
            try:
                p.setFont("DejaVu", 9)
            except:
                p.setFont("Helvetica", 9)
            p.drawString(50, y_position, "Ошибка загрузки изображения")
            y_position -= 30
    
    # Signatures section - Two columns like OkiDoki
    if signature or landlord_signature_hash:
        y_position -= 40
        if y_position < 250:
            p.showPage()
            y_position = height - 50
        
        try:
            p.setFont("DejaVu-Bold", 12)
        except:
            p.setFont("Helvetica-Bold", 12)
        
        p.drawString(50, y_position, "Подписи:")
        y_position -= 30
        
        try:
            p.setFont("DejaVu", 9)
        except:
            p.setFont("Helvetica", 9)
        
        # Two columns layout
        # SWAP: Landlord should be on LEFT visually, so use left coordinate for Landlord
        landlord_x = 50      # LEFT position for Landlord (Наймодатель)
        tenant_x = 300       # RIGHT position for Tenant (Наниматель)
        start_y = y_position
        
        # LEFT COLUMN - Наймодатель (Landlord)
        if landlord_signature_hash:
            y_landlord = start_y
            try:
                p.setFont("DejaVu-Bold", 10)
            except:
                p.setFont("Helvetica-Bold", 10)
            p.drawString(landlord_x, y_landlord, "Подпись Наймодателя:")
            y_landlord -= 20
            
            try:
                p.setFont("DejaVu", 9)
            except:
                p.setFont("Helvetica", 9)
            
            # Код-ключ (aligned)
            p.drawString(landlord_x, y_landlord, "Код-ключ утверждения:")
            y_landlord -= 12
            p.drawString(landlord_x, y_landlord, landlord_signature_hash)
            y_landlord -= 18
            
            # ФИО / Название компании (aligned with tenant name)
            p.drawString(landlord_x, y_landlord, "Название компании:")
            y_landlord -= 12
            # Show company_name from landlord profile first, then contract
            if landlord and landlord.get('company_name'):
                p.drawString(landlord_x, y_landlord, landlord.get('company_name'))
            elif contract.get('landlord_name'):
                p.drawString(landlord_x, y_landlord, contract.get('landlord_name'))
            else:
                p.drawString(landlord_x, y_landlord, "Не указана")
            y_landlord -= 18
            
            # Представитель (aligned)
            p.drawString(landlord_x, y_landlord, "Представитель:")
            y_landlord -= 12
            # Show landlord's full_name from profile if available
            if landlord and landlord.get('full_name'):
                p.drawString(landlord_x, y_landlord, landlord.get('full_name'))
            elif contract.get('landlord_representative'):
                p.drawString(landlord_x, y_landlord, contract.get('landlord_representative'))
            else:
                p.drawString(landlord_x, y_landlord, "Не указан")
            y_landlord -= 18
            
            # Телефон (aligned with tenant phone)
            p.drawString(landlord_x, y_landlord, "Телефон:")
            y_landlord -= 12
            if landlord and landlord.get('phone'):
                p.drawString(landlord_x, y_landlord, landlord.get('phone'))
            else:
                p.drawString(landlord_x, y_landlord, "Не указан")
            y_landlord -= 18
            
            # Email (aligned with tenant email)
            p.drawString(landlord_x, y_landlord, "Email:")
            y_landlord -= 12
            if landlord and landlord.get('email'):
                p.drawString(landlord_x, y_landlord, landlord.get('email'))
            else:
                p.drawString(landlord_x, y_landlord, "Не указан")
            y_landlord -= 18
            
            # ИИН/БИН (aligned)
            p.drawString(landlord_x, y_landlord, "ИИН/БИН:")
            y_landlord -= 12
            # Show IIN from landlord profile first, then contract
            if landlord and landlord.get('iin'):
                p.drawString(landlord_x, y_landlord, landlord.get('iin'))
            elif contract.get('landlord_iin_bin'):
                p.drawString(landlord_x, y_landlord, contract.get('landlord_iin_bin'))
            else:
                p.drawString(landlord_x, y_landlord, "Не указан")
            y_landlord -= 18
            
            # Юридический адрес (aligned)
            p.drawString(landlord_x, y_landlord, "Юридический адрес:")
            y_landlord -= 12
            if landlord and landlord.get('legal_address'):
                p.drawString(landlord_x, y_landlord, landlord.get('legal_address'))
            else:
                p.drawString(landlord_x, y_landlord, "Не указан")
            y_landlord -= 18
            
            # Дата утверждения (aligned)
            p.drawString(landlord_x, y_landlord, "Дата утверждения:")
            y_landlord -= 12
            approved_at = contract.get('approved_at', 'N/A')
            if approved_at != 'N/A':
                try:
                    approved_dt = datetime.fromisoformat(approved_at)
                    approved_at = approved_dt.strftime('%d.%m.%Y %H:%M')
                except:
                    pass
            p.drawString(landlord_x, y_landlord, approved_at)
        
        # RIGHT COLUMN - Наниматель (aligned with left column)
        if signature and signature.get('verified'):
            y_tenant = start_y
            try:
                p.setFont("DejaVu-Bold", 10)
            except:
                p.setFont("Helvetica-Bold", 10)
            p.drawString(tenant_x, y_tenant, "Подпись Нанимателя:")
            y_tenant -= 20
            
            try:
                p.setFont("DejaVu", 9)
            except:
                p.setFont("Helvetica", 9)
            
            # Код-ключ подписи (aligned)
            p.drawString(tenant_x, y_tenant, "Код-ключ подписи:")
            y_tenant -= 12
            p.drawString(tenant_x, y_tenant, signature.get('signature_hash', 'N/A'))
            y_tenant -= 18
            
            # ФИО нанимателя (aligned) - try placeholder_values first
            p.drawString(tenant_x, y_tenant, "ФИО нанимателя:")
            y_tenant -= 12
            tenant_name = contract.get('signer_name', 'N/A')
            # Try to find from placeholder_values if template exists
            if contract.get('placeholder_values'):
                for key, value in contract['placeholder_values'].items():
                    if 'ФИО' in key.upper() and 'НАНИМАТЕЛЬ' in key.upper() and value:
                        tenant_name = value
                        break
            p.drawString(tenant_x, y_tenant, tenant_name)
            y_tenant -= 18
            
            # Представитель - skip for tenant to keep alignment
            y_tenant -= 30  # Skip this section
            
            # Телефон (aligned) - try placeholder_values first
            p.drawString(tenant_x, y_tenant, "Телефон:")
            y_tenant -= 12
            tenant_phone = contract.get('signer_phone', 'N/A')
            if contract.get('placeholder_values'):
                for key, value in contract['placeholder_values'].items():
                    if 'НОМЕР' in key.upper() and 'КЛИЕНТ' in key.upper() and value:
                        tenant_phone = value
                        break
            p.drawString(tenant_x, y_tenant, tenant_phone)
            y_tenant -= 18
            
            # Email (aligned) - try placeholder_values first
            p.drawString(tenant_x, y_tenant, "Email:")
            y_tenant -= 12
            tenant_email = contract.get('signer_email', 'Не указан')
            if contract.get('placeholder_values'):
                for key, value in contract['placeholder_values'].items():
                    if 'EMAIL' in key.upper() and 'КЛИЕНТ' in key.upper() and value:
                        tenant_email = value
                        break
            p.drawString(tenant_x, y_tenant, tenant_email if tenant_email else 'Не указан')
            y_tenant -= 18
            
            # Метод подписания (instead of IIN/BIN - aligned)
            p.drawString(tenant_x, y_tenant, "Метод подписания:")
            y_tenant -= 12
            # Get verification_method from signature, fallback to contract
            verification_method = signature.get('verification_method') or contract.get('verification_method', 'N/A')
            method_text = {
                'sms': 'SMS',
                'call': 'Входящий звонок',
                'telegram': 'Telegram'
            }.get(verification_method, verification_method)
            p.drawString(tenant_x, y_tenant, method_text)
            y_tenant -= 18
            
            # Telegram ID (ONLY show for Telegram method)
            if verification_method == 'telegram':
                p.drawString(tenant_x, y_tenant, "Telegram ID:")
                y_tenant -= 12
                # Get telegram_username from signature, fallback to contract
                telegram_username = signature.get('telegram_username') or contract.get('telegram_username', '')
                if telegram_username:
                    # Add @ if not present
                    if not telegram_username.startswith('@'):
                        telegram_username = f"@{telegram_username}"
                    p.drawString(tenant_x, y_tenant, telegram_username)
                else:
                    p.drawString(tenant_x, y_tenant, "Не указан")
                y_tenant -= 18
            else:
                # Skip Telegram ID section for SMS/Call to keep alignment
                # Add placeholder space to keep alignment with landlord column
                y_tenant -= 30
            
            # Дата подписания (aligned)
            p.drawString(tenant_x, y_tenant, "Дата подписания:")
            y_tenant -= 12
            signed_at = signature.get('signed_at', 'N/A')
            if signed_at != 'N/A':
                try:
                    signed_dt = datetime.fromisoformat(signed_at)
                    signed_at = signed_dt.strftime('%d.%m.%Y %H:%M')
                except:
                    pass
            p.drawString(tenant_x, y_tenant, signed_at)
        
        # Update y_position to continue below both columns
        y_position = min(y_landlord if landlord_signature_hash else start_y, 
                        y_tenant if (signature and signature.get('verified')) else start_y) - 20
    
    p.save()
    pdf_buffer.seek(0)
    return pdf_buffer.getvalue()

def replace_placeholders_in_content(content: str, contract: dict) -> str:
    """Replace placeholders in contract content with actual values"""
    # Get values from contract or use placeholders, ensure all are strings
    signer_name = str(contract.get('signer_name', '')) if contract.get('signer_name') else '[ФИО Нанимателя]'
    signer_phone = str(contract.get('signer_phone', '')) if contract.get('signer_phone') else '[Телефон]'
    signer_email = str(contract.get('signer_email', '')) if contract.get('signer_email') else '[Email]'
    move_in_date = str(contract.get('move_in_date', '')) if contract.get('move_in_date') else '[Дата заселения]'
    move_out_date = str(contract.get('move_out_date', '')) if contract.get('move_out_date') else '[Дата выселения]'
    property_address = str(contract.get('property_address', '')) if contract.get('property_address') else '[Адрес квартиры]'
    rent_amount = str(contract.get('rent_amount', '')) if contract.get('rent_amount') else '[Цена в сутки]'
    days_count = str(contract.get('days_count', '')) if contract.get('days_count') else '[Количество суток]'
    
    # Ensure content is string
    if not isinstance(content, str):
        content = str(content)
    
    # Replace placeholders only if we have actual values (not empty strings)
    if signer_name and signer_name != '[ФИО Нанимателя]':
        content = content.replace('[ФИО Нанимателя]', signer_name)
        content = content.replace('[ФИО]', signer_name)
    
    if signer_phone and signer_phone != '[Телефон]':
        content = content.replace('[Телефон]', signer_phone)
    
    if signer_email and signer_email != '[Email]':
        content = content.replace('[Email]', signer_email)
    
    if move_in_date and move_in_date != '[Дата заселения]':
        content = content.replace('[Дата заселения]', move_in_date)
    
    if move_out_date and move_out_date != '[Дата выселения]':
        content = content.replace('[Дата выселения]', move_out_date)
    
    if property_address and property_address != '[Адрес квартиры]':
        content = content.replace('[Адрес квартиры]', property_address)
    
    if rent_amount and rent_amount != '[Цена в сутки]':
        content = content.replace('[Цена в сутки]', rent_amount)
    
    if days_count and days_count != '[Количество суток]':
        content = content.replace('[Количество суток]', days_count)
    
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
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(credentials.password, user_doc['password']):
        await log_user_action(user_doc['id'], "login_failed", "Wrong password", request.client.host)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
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
        # Don't reveal if user exists or not for security
        return {"message": "If the email exists, a reset code has been sent"}
    
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
    
    # Send email with reset code
    subject = "Password Reset Code - Signify KZ"
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Password Reset Request</h2>
                <p>You requested to reset your password for Signify KZ.</p>
                <p>Your password reset code is:</p>
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                    {reset_code}
                </div>
                <p>This code will expire in <strong>1 hour</strong>.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 12px;">Signify KZ - Remote Contract Signing Platform</p>
            </div>
        </body>
    </html>
    """
    
    send_email(request.email, subject, body)
    
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
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number not found")
    
    # Use Twilio Verify API
    channel = "sms" if method == "sms" else "call"
    result = send_otp_via_twilio(phone, channel)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {result.get('error', 'Unknown error')}")
    
    # Store verification info
    update_data = {
        "verification_method": method,
        "otp_requested_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If mock OTP is present (fallback mode), store it
    if "mock_otp" in result:
        update_data["otp_code"] = result["mock_otp"]
    
    await db.registrations.update_one(
        {"id": registration_id},
        {"$set": update_data}
    )
    
    await log_audit("registration_otp_requested", details=f"Method: {method}, Phone: {phone}, registration_id: {registration_id}")
    
    response = {"message": f"OTP sent via {method}"}
    # Include mock OTP only in development/fallback mode
    if "mock_otp" in result:
        response["mock_otp"] = result["mock_otp"]
    
    return response

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
    
    # Verify OTP via Twilio
    result = verify_otp_via_twilio(phone, otp_code)
    
    # If Twilio verification failed, check if it's a mock OTP (fallback mode)
    if not result["success"]:
        stored_otp = registration.get('otp_code')
        if stored_otp and stored_otp == otp_code:
            # Mock OTP matches
            logging.info(f"✅ Mock OTP verified for registration {registration_id}")
        else:
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
    """Request phone call verification during registration"""
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
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number not found")
    
    # Normalize phone to E.164 format
    phone = normalize_phone(phone)
    
    try:
        # Make call via Twilio
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        call = client.calls.create(
            to=phone,
            from_=TWILIO_PHONE_NUMBER,
            url="http://demo.twilio.com/docs/voice.xml",
            timeout=10
        )
        
        # Extract last 4 digits from our number
        caller_number = TWILIO_PHONE_NUMBER.replace('+', '').replace(' ', '').replace('-', '')
        last_4_digits = caller_number[-4:]
        
        # Store verification data
        verification_data = {
            "registration_id": registration_id,
            "phone": phone,
            "call_sid": call.sid,
            "expected_code": last_4_digits,
            "method": "call",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
            "verified": False
        }
        
        await db.verifications.insert_one(verification_data)
        
        logging.info(f"✅ Registration call initiated to {phone}, SID: {call.sid}")
        
        return {
            "message": "Звонок инициирован. Введите последние 4 цифры входящего номера.",
            "call_sid": call.sid,
            "hint": f"Номер заканчивается на: ...{last_4_digits}"
        }
        
    except Exception as e:
        logging.error(f"Registration call error: {str(e)}")
        # Fallback: return mock response
        last_4_digits = "1334"
        
        verification_data = {
            "registration_id": registration_id,
            "phone": phone,
            "call_sid": "MOCK_CALL",
            "expected_code": last_4_digits,
            "method": "call",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
            "verified": False
        }
        
        await db.verifications.insert_one(verification_data)
        
        return {
            "message": "Mock: Звонок инициирован. Введите последние 4 цифры.",
            "hint": f"Номер заканчивается на: ...{last_4_digits}"
        }

@api_router.post("/auth/registration/{registration_id}/verify-call-otp")
async def verify_registration_call_otp(registration_id: str, data: dict):
    """Verify call OTP and create user account"""
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
        "method": "call",
        "verified": False
    })
    
    if not verification:
        raise HTTPException(status_code=404, detail="Call verification not found")
    
    # Check if expired
    expires_at = verification.get('expires_at')
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification expired")
    
    # Verify code
    expected_code = verification.get('expected_code')
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
    
    await log_audit("user_registered", user_id=user.id, details=f"User {user.email} registered after call verification")
    
    return {"token": token, "user": user, "verified": True}

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
    contract_limit = user.get('contract_limit', 10) if user else 10
    
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
        landlord_iin_bin=landlord_iin_bin  # From user profile
    )
    
    doc = contract.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.contracts.insert_one(doc)
    
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
    contract_limit = user.get('contract_limit', 10) if user else 10
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
                for key, value in placeholder_values.items():
                    if key in template['placeholders'] and value:  # Only replace if value is not empty
                        config = template['placeholders'][key]
                        
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
    
    return {"message": "Contract sent successfully", "signature_link": signature_link, "mock_otp": otp_code}

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
        
        # КРИТИЧНО: Копируем email из placeholder_values в signer_email
        for key in ['EMAIL_КЛИЕНТА', 'EMAIL_НАНИМАТЕЛЯ', 'email', 'Email', 'signer_email', 'tenant_email', 'client_email']:
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
                    
                    # Replace values in content by finding old values and replacing with new ones
                    for key, config in template['placeholders'].items():
                        if key in placeholder_values:
                            new_value = placeholder_values[key]
                            old_value = existing_values.get(key)
                            
                            if new_value and old_value != new_value:  # Only replace if value changed
                                # Format dates to DD.MM.YYYY
                                if config.get('type') == 'date':
                                    try:
                                        from datetime import datetime as dt
                                        date_obj = dt.fromisoformat(new_value.replace('Z', '+00:00'))
                                        new_value = date_obj.strftime('%d.%m.%Y')
                                    except:
                                        pass
                                
                                old_content = updated_content
                                
                                # Strategy 1: Replace {{key}} if still exists
                                import re
                                pattern = re.compile(f'{{{{\\s*{key}\\s*}}}}')
                                updated_content = pattern.sub(str(new_value), updated_content)
                                
                                # Strategy 2: Replace [label] if still exists
                                label = config.get('label', key)
                                updated_content = updated_content.replace(f'[{label}]', str(new_value))
                                
                                # Strategy 3: Direct value replacement (НОВОЕ!)
                                if old_value and str(old_value) in updated_content:
                                    # Replace old value with new value in content
                                    updated_content = updated_content.replace(str(old_value), str(new_value))
                                    print(f"🔧 ✅ Replaced OLD VALUE '{old_value}' with NEW VALUE '{new_value}' for {key}")
                                elif old_content != updated_content:
                                    print(f"🔧 ✅ Replaced placeholder {key} ({label}) with value: {new_value}")
                                else:
                                    print(f"🔧 ❌ Could not replace {key} - old_value='{old_value}', new_value='{new_value}'")
                    
                    
                    print(f"🔧 Final content preview: {updated_content[:200]}...")
                    print(f"🔧 ✅ Placeholders replacement completed")
                    
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

@api_router.post("/sign/{contract_id}/upload-document")
async def upload_document(contract_id: str, file: UploadFile = File(...)):
    # Allow overwriting - client can replace document anytime
    # Removed check that prevented re-upload
    
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
    
    # Mock OCR validation
    if not verify_document_ocr(file_data):
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
    
    return {"message": "Document uploaded successfully"}

@api_router.post("/sign/{contract_id}/request-otp")
async def request_otp(contract_id: str, method: str = "sms"):
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Try to get phone from signer_phone field first
    phone_to_use = contract.get('signer_phone')
    
    # If not found and contract has placeholder_values, search there
    if not phone_to_use and contract.get('placeholder_values'):
        placeholder_values = contract.get('placeholder_values', {})
        # Try common phone field keys
        for key in ['tenant_phone', 'signer_phone', 'client_phone', 'phone']:
            if key in placeholder_values and placeholder_values[key]:
                phone_to_use = placeholder_values[key]
                break
    
    if not phone_to_use:
        raise HTTPException(status_code=400, detail="Signer phone number is required")
    
    # Use Twilio Verify API
    channel = "sms" if method == "sms" else "call"
    result = send_otp_via_twilio(phone_to_use, channel)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {result.get('error', 'Unknown error')}")
    
    # Store verification info in signature
    update_data = {
        "verification_method": method,
        "signer_phone": phone_to_use,
        "otp_requested_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If mock OTP is present (fallback mode), store it
    if "mock_otp" in result:
        update_data["otp_code"] = result["mock_otp"]
    
    await db.signatures.update_one(
        {"contract_id": contract_id},
        {"$set": update_data},
        upsert=True
    )
    
    await log_audit("otp_requested", contract_id=contract_id, details=f"Method: {method}, Phone: {phone_to_use}")
    
    response = {"message": f"OTP sent via {method}"}
    # Include mock OTP only in development/fallback mode
    if "mock_otp" in result:
        response["mock_otp"] = result["mock_otp"]
    
    return response

@api_router.post("/sign/{contract_id}/request-call-otp")
async def request_call_otp(contract_id: str):
    """Request phone call verification - user enters last 4 digits of caller ID"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Try to get phone from signer_phone field first
    phone = contract.get('signer_phone')
    
    # If not found and contract has placeholder_values, search there
    if not phone and contract.get('placeholder_values'):
        placeholder_values = contract.get('placeholder_values', {})
        # Try common phone field keys
        for key in ['tenant_phone', 'signer_phone', 'client_phone', 'phone']:
            if key in placeholder_values and placeholder_values[key]:
                phone = placeholder_values[key]
                break
    
    if not phone:
        raise HTTPException(status_code=400, detail="Signer phone not found")
    
    # Normalize phone to E.164 format
    phone = normalize_phone(phone)
    
    try:
        # Make call via Twilio - phone will ring and disconnect
        # User will see caller ID and enter last 4 digits
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Make a very short call (will appear as missed call)
        call = client.calls.create(
            to=phone,
            from_=TWILIO_PHONE_NUMBER,
            url="http://demo.twilio.com/docs/voice.xml",  # Empty TwiML - call disconnects immediately
            timeout=10
        )
        
        # Store call SID and extract last 4 digits from our number
        caller_number = TWILIO_PHONE_NUMBER.replace('+', '').replace(' ', '').replace('-', '')
        last_4_digits = caller_number[-4:]
        
        # Store verification data in database
        verification_data = {
            "contract_id": contract_id,
            "phone": phone,
            "call_sid": call.sid,
            "expected_code": last_4_digits,
            "method": "call",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
            "verified": False
        }
        
        await db.verifications.insert_one(verification_data)
        
        logging.info(f"✅ Call initiated to {phone}, SID: {call.sid}, Last 4 digits: {last_4_digits}")
        
        return {
            "message": "Звонок инициирован. Введите последние 4 цифры входящего номера.",
            "call_sid": call.sid,
            "hint": f"Номер заканчивается на: ...{last_4_digits}"
        }
        
    except Exception as e:
        logging.error(f"Call OTP error: {str(e)}")
        # Fallback: return mock response for testing
        last_4_digits = "1334"  # From our Twilio number
        
        verification_data = {
            "contract_id": contract_id,
            "phone": phone,
            "call_sid": "MOCK_CALL",
            "expected_code": last_4_digits,
            "method": "call",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
            "verified": False
        }
        
        await db.verifications.insert_one(verification_data)
        
        return {
            "message": "[TEST MODE] Введите последние 4 цифры: 1334",
            "call_sid": "MOCK_CALL",
            "hint": "Тестовый режим - код: 1334"
        }

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

@api_router.post("/sign/{contract_id}/request-telegram-otp")
async def request_telegram_otp(contract_id: str, data: dict):
    """Request OTP via Telegram - user provides their Telegram username"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    telegram_username = data.get('telegram_username', '').strip().replace('@', '')
    if not telegram_username:
        raise HTTPException(status_code=400, detail="Telegram username required")
    
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
                "telegram_username": telegram_username,
                "mock_otp": otp_code
            }
        
        from telegram import Bot
        import asyncio
        
        bot = Bot(token=TELEGRAM_BOT_TOKEN)
        
        message = f"""
🔐 *Signify KZ - Код подтверждения*

Ваш код для подписания договора:
`{otp_code}`

Введите этот код на сайте для подтверждения.

Договор: {contract['title']}
        """
        
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
                # Use stored chat_id
                await bot.send_message(
                    chat_id=chat_id,
                    text=message,
                    parse_mode='Markdown'
                )
                logging.info(f"✅ Telegram message sent to {telegram_username} (chat_id: {chat_id})")
            else:
                # Fallback: try username (will likely fail)
                await bot.send_message(
                    chat_id=f"@{telegram_username}",
                    text=message,
                    parse_mode='Markdown'
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
                    "telegram_username": telegram_username,
                    "mock_otp": otp_code
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
async def verify_otp(contract_id: str, otp_data: OTPVerify):
    # Find signature
    signature = await db.signatures.find_one({"contract_id": contract_id})
    if not signature:
        raise HTTPException(status_code=404, detail="Signature not found")
    
    # Verify OTP via Twilio
    verification_result = verify_otp_via_twilio(otp_data.phone, otp_data.otp_code)
    
    # If Twilio verification failed, check if we have a mock OTP stored (fallback mode)
    if not verification_result["success"]:
        if "otp_code" in signature and signature['otp_code'] == otp_data.otp_code:
            # Accept mock OTP for testing/fallback
            logging.info(f"✅ Accepted mock OTP for contract {contract_id}")
        else:
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
    
    return {"message": "Signature verified successfully", "signature_hash": signature_hash}

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
        
        # Use the centralized PDF generation function
        pdf_bytes = generate_contract_pdf(contract, signature, landlord_signature_hash, landlord)
        print(f"🔥 DEBUG: PDF generated, size: {len(pdf_bytes)} bytes")
        
        # Send email to signer
        if contract.get('signer_email'):
            subject = f"✅ Подписанный договор: {contract['title']}"
            
            # Create beautiful HTML email
            body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }}
        .footer {{ background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }}
        .signature-box {{ background: #f0f4ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }}
        .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }}
        h2 {{ color: #667eea; }}
        .code {{ font-family: monospace; font-size: 18px; font-weight: bold; color: #764ba2; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Договор успешно подписан!</h1>
        </div>
        
        <div class="content">
            <h2>Здравствуйте, {contract['signer_name']}!</h2>
            
            <p>Поздравляем! Ваш договор <strong>"{contract['title']}"</strong> был успешно подписан и утвержден наймодателем.</p>
            
            <p>Во вложении к этому письму находится подписанный договор в формате PDF.</p>
            
            <div class="signature-box">
                <h3>📝 Информация о подписях:</h3>
                <p><strong>Код-ключ вашей подписи:</strong><br>
                <span class="code">{signature.get('signature_hash', 'N/A')}</span></p>
                
                <p><strong>Код-ключ наймодателя:</strong><br>
                <span class="code">{landlord_signature_hash}</span></p>
                
                <p style="font-size: 12px; color: #666; margin-top: 15px;">
                Эти ключи подтверждают подлинность подписей и могут быть использованы для проверки договора.
                </p>
            </div>
            
            <p><strong>Дата подписания:</strong> {datetime.now().strftime('%d.%m.%Y')}</p>
            
            <p style="margin-top: 30px;">Если у вас возникли вопросы, пожалуйста, свяжитесь с наймодателем или нашей службой поддержки.</p>
        </div>
        
        <div class="footer">
            <p>С уважением,<br><strong>Команда Signify KZ</strong></p>
            <p style="margin-top: 10px;">
                Платформа для дистанционного подписания договоров<br>
                <a href="https://signify-kz.com" style="color: #667eea;">signify-kz.com</a>
            </p>
        </div>
    </div>
</body>
</html>
            """
            
            print(f"🔥 DEBUG: About to call send_email to {contract['signer_email']}")
            result = send_email(
                to_email=contract['signer_email'],
                subject=subject,
                body=body,
                attachment=pdf_bytes,
                filename=f"contract-{contract_id}.pdf"
            )
            print(f"🔥 DEBUG: send_email result: {result}")
            logging.info(f"✅ Email sent to {contract['signer_email']} with PDF attachment")
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
    
    # Generate PDF using centralized function
    try:
        print(f"🔥 Generating PDF...")
        pdf_bytes = generate_contract_pdf(contract, signature, landlord_signature_hash, landlord)
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
    
    # Generate PDF using centralized function
    try:
        print(f"🔥 Generating PDF...")
        pdf_bytes = generate_contract_pdf(contract, signature, landlord_signature_hash, landlord)
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
async def get_all_users(current_user: dict = Depends(get_current_user), search: str = None):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    
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
        'contract_limit': user.get('contract_limit', 10)
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
    
    current_limit = user.get('contract_limit', 10)
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
    await db.contract_templates.insert_one(template_dict)
    
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
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    import psutil
    import time
    
    # CPU и память
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Uptime
    boot_time = psutil.boot_time()
    uptime_seconds = time.time() - boot_time
    uptime_days = int(uptime_seconds // 86400)
    uptime_hours = int((uptime_seconds % 86400) // 3600)
    
    # Network
    try:
        net_io = psutil.net_io_counters()
        network_stats = {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv
        }
    except:
        network_stats = None
    
    # Recent errors from logs
    try:
        with open('/var/log/supervisor/backend.err.log', 'r') as f:
            error_lines = f.readlines()[-100:]  # Last 100 lines
            recent_errors = [line.strip() for line in error_lines if 'ERROR' in line or 'Exception' in line][-20:]  # Last 20 errors
    except:
        recent_errors = []
    
    # Database stats
    db_stats = await db.command("dbStats")
    
    # Active users (logged in last 24h)
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    active_users_count = await db.user_logs.count_documents({
        "action": "login_success",
        "timestamp": {"$gte": yesterday.isoformat()}
    })
    
    # Online users (any activity in last 15 minutes) - count unique users
    fifteen_min_ago = datetime.now(timezone.utc) - timedelta(minutes=15)
    online_pipeline = [
        {"$match": {"timestamp": {"$gte": fifteen_min_ago.isoformat()}}},
        {"$group": {"_id": "$user_id"}},
        {"$count": "unique_users"}
    ]
    online_result = await db.user_logs.aggregate(online_pipeline).to_list(1)
    online_users_count = online_result[0]['unique_users'] if online_result else 0
    
    return {
        "status": "healthy",
        "cpu_percent": cpu_percent,
        "memory": {
            "total_gb": round(memory.total / (1024**3), 2),
            "used_gb": round(memory.used / (1024**3), 2),
            "available_gb": round(memory.available / (1024**3), 2),
            "percent": memory.percent
        },
        "disk": {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "percent": disk.percent
        },
        "uptime": {
            "days": uptime_days,
            "hours": uptime_hours,
            "total_seconds": int(uptime_seconds)
        },
        "network": network_stats,
        "database": {
            "size_mb": round(db_stats.get('dataSize', 0) / (1024**2), 2),
            "collections": db_stats.get('collections', 0),
            "indexes": db_stats.get('indexes', 0)
        },
        "active_users_24h": active_users_count,
        "online_users": online_users_count,
        "recent_errors": recent_errors[-20:] if recent_errors else []  # Return last 20 errors
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


# ==================== UPLOAD PDF CONTRACT ====================

@api_router.post("/contracts/upload-pdf")
async def upload_pdf_contract(
    file: UploadFile = File(...),
    title: str = Form(...),
    signer_email: str = Form(...),
    signer_phone: str = Form(...),
    signer_name: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Загрузить готовый PDF договор для подписания"""
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Validate file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")
    
    # Save file to server
    upload_dir = "/app/backend/uploaded_contracts"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    file_path = f"{upload_dir}/{file_id}.pdf"
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Get user info for landlord fields
    user = await db.users.find_one({"id": current_user['user_id']})
    
    # Create contract
    contract = Contract(
        title=title,
        content="",  # Empty for uploaded PDF
        content_type="plain",
        creator_id=current_user['user_id'],
        source_type="uploaded_pdf",
        uploaded_pdf_path=file_path,
        signer_name=signer_name or "",
        signer_email=signer_email,
        signer_phone=signer_phone,
        status="sent",
        landlord_name=user.get('company_name', ''),
        landlord_email=user.get('email', ''),
        landlord_full_name=user.get('full_name', ''),
        landlord_iin_bin=user.get('iin', ''),
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
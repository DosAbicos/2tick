from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, status
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
from fastapi.responses import StreamingResponse
import random
import base64
import hashlib

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

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===== MODELS =====
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    phone: str
    role: str = "creator"  # creator, signer, admin
    language: str = "ru"  # ru, kk, en
    iin: Optional[str] = None  # ИИН (Individual Identification Number)
    document_upload: Optional[str] = None  # Landlord's ID/passport
    document_filename: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    language: str = "ru"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    creator_id: str
    signer_name: str
    signer_phone: str
    signer_email: Optional[str] = None
    status: str = "draft"  # draft, sent, pending-signature, signed, declined
    amount: Optional[str] = None
    file_data: Optional[str] = None  # base64 encoded file
    signature_link: Optional[str] = None
    landlord_signature_hash: Optional[str] = None  # Landlord's signature hash
    approved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContractCreate(BaseModel):
    title: str
    content: str
    signer_name: Optional[str] = None  # Can be filled by signer
    signer_phone: Optional[str] = None  # Can be filled by signer
    signer_email: Optional[str] = None
    amount: Optional[str] = None

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

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_otp() -> str:
    """Generate a 6-digit OTP code (mocked)"""
    return str(random.randint(100000, 999999))

def send_sms(phone: str, message: str) -> bool:
    """Mocked SMS sending"""
    logging.info(f"[MOCK SMS] To: {phone} | Message: {message}")
    return True

def make_call(phone: str, code: str) -> bool:
    """Mocked voice call"""
    logging.info(f"[MOCK CALL] To: {phone} | Code: {code}")
    return True

def send_email(to_email: str, subject: str, body: str, attachment: bytes = None, filename: str = None) -> bool:
    """Mocked email sending"""
    logging.info(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}")
    if attachment:
        logging.info(f"[MOCK EMAIL] Attachment: {filename} ({len(attachment)} bytes)")
    return True

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

# ===== AUTH ROUTES =====
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone,
        language=user_data.language
    )
    
    user_doc = user.model_dump()
    user_doc['password'] = hashed_password
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Generate token
    token = create_jwt_token(user.id, user.email, user.role)
    
    await log_audit("user_registered", user_id=user.id, details=f"User {user.email} registered")
    
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Convert to User model
    user_doc.pop('password', None)
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    user = User(**user_doc)
    
    # Generate token
    token = create_jwt_token(user.id, user.email, user.role)
    
    await log_audit("user_login", user_id=user.id, details=f"User {user.email} logged in")
    
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    return User(**user_doc)

@api_router.post("/auth/update-profile")
async def update_profile(iin: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    update_data = {}
    if iin:
        update_data['iin'] = iin
    
    if update_data:
        await db.users.update_one(
            {"id": current_user['user_id']},
            {"$set": update_data}
        )
    
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

# ===== CONTRACT ROUTES =====
@api_router.post("/contracts", response_model=Contract)
async def create_contract(contract_data: ContractCreate, current_user: dict = Depends(get_current_user)):
    contract = Contract(
        title=contract_data.title,
        content=contract_data.content,
        creator_id=current_user['user_id'],
        signer_name=contract_data.signer_name,
        signer_phone=contract_data.signer_phone,
        signer_email=contract_data.signer_email,
        amount=contract_data.amount
    )
    
    doc = contract.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.contracts.insert_one(doc)
    await log_audit("contract_created", contract_id=contract.id, user_id=current_user['user_id'])
    
    return contract

@api_router.get("/contracts", response_model=List[Contract])
async def get_contracts(current_user: dict = Depends(get_current_user)):
    contracts = await db.contracts.find({"creator_id": current_user['user_id']}, {"_id": 0}).to_list(1000)
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
    result = await db.contracts.delete_one({"id": contract_id, "creator_id": current_user['user_id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    await log_audit("contract_deleted", contract_id=contract_id, user_id=current_user['user_id'])
    return {"message": "Contract deleted"}

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
    return Contract(**contract)

@api_router.post("/sign/{contract_id}/update-signer-info")
async def update_signer_info(
    contract_id: str,
    signer_name: Optional[str] = None,
    signer_phone: Optional[str] = None,
    signer_email: Optional[str] = None
):
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    update_data = {}
    if signer_name:
        update_data['signer_name'] = signer_name
    if signer_phone:
        update_data['signer_phone'] = signer_phone
    if signer_email:
        update_data['signer_email'] = signer_email
    
    if update_data:
        await db.contracts.update_one(
            {"id": contract_id},
            {"$set": update_data}
        )
    
    return {"message": "Signer info updated"}

@api_router.post("/sign/{contract_id}/upload-document")
async def upload_document(contract_id: str, file: UploadFile = File(...)):
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
    
    otp_code = generate_otp()
    
    if method == "sms":
        send_sms(contract['signer_phone'], f"Your OTP: {otp_code}")
    elif method == "call":
        make_call(contract['signer_phone'], otp_code)
    
    # Store or update OTP
    await db.signatures.update_one(
        {"contract_id": contract_id},
        {"$set": {"otp_code": otp_code, "verification_method": method}},
        upsert=True
    )
    
    await log_audit("otp_requested", contract_id=contract_id, details=f"Method: {method}")
    
    return {"message": f"OTP sent via {method}", "mock_otp": otp_code}

@api_router.post("/sign/{contract_id}/verify-otp")
async def verify_otp(contract_id: str, otp_data: OTPVerify):
    # Find signature
    signature = await db.signatures.find_one({"contract_id": contract_id})
    if not signature:
        raise HTTPException(status_code=404, detail="Signature not found")
    
    # Verify OTP
    if signature['otp_code'] != otp_data.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    # Generate unique signature hash
    signature_data = f"{contract_id}-{signature['signer_phone']}-{datetime.now(timezone.utc).isoformat()}"
    signature_hash = hashlib.sha256(signature_data.encode()).hexdigest()[:16].upper()
    
    # Mark as verified and signed
    await db.signatures.update_one(
        {"contract_id": contract_id},
        {"$set": {
            "verified": True,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "signature_hash": signature_hash
        }}
    )
    
    # Update contract status
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "status": "pending-signature",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_audit("signature_verified", contract_id=contract_id)
    
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
    
    # Get contract and signature for email
    contract = await db.contracts.find_one({"id": contract_id})
    signature = await db.signatures.find_one({"contract_id": contract_id})
    creator = await db.users.find_one({"id": contract['creator_id']})
    
    # Generate PDF for email
    try:
        # Register fonts
        try:
            dejavu_path = '/usr/share/fonts/truetype/dejavu/'
            pdfmetrics.registerFont(TTFont('DejaVu', dejavu_path + 'DejaVuSans.ttf'))
            pdfmetrics.registerFont(TTFont('DejaVu-Bold', dejavu_path + 'DejaVuSans-Bold.ttf'))
            pdfmetrics.registerFont(TTFont('DejaVu-Mono', dejavu_path + 'DejaVuSansMono.ttf'))
        except:
            pass
        
        # Generate PDF (simplified version for email)
        pdf_buffer = BytesIO()
        p = canvas.Canvas(pdf_buffer, pagesize=A4)
        width, height = A4
        
        try:
            p.setFont("DejaVu-Bold", 16)
        except:
            p.setFont("Helvetica-Bold", 16)
        
        p.drawString(50, height - 50, contract['title'])
        p.setFont("DejaVu", 10) if 'DejaVu' in pdfmetrics.getRegisteredFontNames() else p.setFont("Helvetica", 10)
        p.drawString(50, height - 80, f"Договор подписан {datetime.now().strftime('%d.%m.%Y')}")
        
        p.save()
        pdf_buffer.seek(0)
        pdf_bytes = pdf_buffer.getvalue()
        
        # Send email to signer
        if contract.get('signer_email'):
            subject = f"Подписанный договор: {contract['title']}"
            body = f"""
Здравствуйте, {contract['signer_name']}!

Ваш договор "{contract['title']}" был успешно подписан и утвержден.

Во вложении находится подписанный договор в формате PDF.

Код-ключ вашей подписи: {signature.get('signature_hash', 'N/A')}
Код-ключ наймодателя: {landlord_signature_hash}

С уважением,
Signify KZ
            """
            
            send_email(
                to_email=contract['signer_email'],
                subject=subject,
                body=body,
                attachment=pdf_bytes,
                filename=f"contract-{contract_id}.pdf"
            )
    except Exception as e:
        logging.error(f"Error sending email: {str(e)}")
    
    return {"message": "Contract approved and signed", "landlord_signature_hash": landlord_signature_hash}

# ===== PDF GENERATION =====
@api_router.get("/contracts/{contract_id}/download-pdf")
async def download_pdf(contract_id: str, current_user: dict = Depends(get_current_user)):
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    signature = await db.signatures.find_one({"contract_id": contract_id})
    creator = await db.users.find_one({"id": contract['creator_id']})
    
    # Register DejaVu fonts for Cyrillic support
    try:
        dejavu_path = '/usr/share/fonts/truetype/dejavu/'
        pdfmetrics.registerFont(TTFont('DejaVu', dejavu_path + 'DejaVuSans.ttf'))
        pdfmetrics.registerFont(TTFont('DejaVu-Bold', dejavu_path + 'DejaVuSans-Bold.ttf'))
        pdfmetrics.registerFont(TTFont('DejaVu-Mono', dejavu_path + 'DejaVuSansMono.ttf'))
    except Exception as e:
        logging.error(f"Font registration error: {str(e)}")
        # Fallback to Helvetica
        pass
    
    # Generate PDF
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Use DejaVu font
    try:
        p.setFont("DejaVu-Bold", 20)
    except:
        p.setFont("Helvetica-Bold", 20)
    
    y_position = height - 80
    
    # Title
    title_text = contract['title']
    p.drawString(50, y_position, title_text[:60])
    y_position -= 60
    
    # Content with DejaVu font
    try:
        p.setFont("DejaVu", 9)
    except:
        p.setFont("Helvetica", 9)
    
    lines = contract['content'].split('\n')
    
    for line in lines:
        # Check if we need new page
        if y_position < 100:
            p.showPage()
            y_position = height - 50
            try:
                p.setFont("DejaVu", 9)
            except:
                p.setFont("Helvetica", 9)
        
        # Handle long lines
        if len(line) > 95:
            words = line.split(' ')
            current_line = ''
            for word in words:
                test_line = current_line + word + ' '
                if len(test_line) > 95:
                    if current_line:
                        p.drawString(50, y_position, current_line.strip())
                        y_position -= 12
                        if y_position < 100:
                            p.showPage()
                            y_position = height - 50
                            try:
                                p.setFont("DejaVu", 9)
                            except:
                                p.setFont("Helvetica", 9)
                    current_line = word + ' '
                else:
                    current_line = test_line
            
            if current_line:
                p.drawString(50, y_position, current_line.strip())
                y_position -= 12
        else:
            p.drawString(50, y_position, line)
            y_position -= 12
    
    # Signature section
    if signature and signature.get('verified') and contract.get('status') == 'signed':
        # New page for signatures
        p.showPage()
        y_position = height - 50
        
        # Header
        try:
            p.setFont("DejaVu-Bold", 12)
        except:
            p.setFont("Helvetica-Bold", 12)
        
        header1 = "Документ подписан при помощи сервиса Signify KZ"
        p.drawCentredString(width / 2, y_position, header1)
        y_position -= 20
        
        try:
            p.setFont("DejaVu", 10)
        except:
            p.setFont("Helvetica", 10)
        
        header2 = "с использованием почты и номера телефона"
        p.drawCentredString(width / 2, y_position, header2)
        y_position -= 40
        
        # Contract ID
        try:
            p.setFont("DejaVu-Bold", 11)
        except:
            p.setFont("Helvetica-Bold", 11)
        
        p.drawString(50, y_position, f"ID документа: {contract_id}")
        y_position -= 50
        
        # Two columns for signatures
        col1_x = 50
        col2_x = 310
        sig_y = y_position
        
        # Landlord signature (left)
        try:
            p.setFont("DejaVu-Bold", 11)
        except:
            p.setFont("Helvetica-Bold", 11)
        
        p.drawString(col1_x, sig_y, "Подпись Наймодателя:")
        sig_y -= 20
        
        try:
            p.setFont("DejaVu-Mono", 10)
        except:
            p.setFont("Courier-Bold", 10)
        
        if contract.get('landlord_signature_hash'):
            p.drawString(col1_x, sig_y, contract['landlord_signature_hash'])
            sig_y -= 18
        
        try:
            p.setFont("DejaVu", 9)
        except:
            p.setFont("Helvetica", 9)
        
        if creator:
            name = creator.get('full_name', 'N/A')
            p.drawString(col1_x, sig_y, name[:30])
            sig_y -= 12
            email = creator.get('email', 'N/A')
            p.drawString(col1_x, sig_y, f"Email: {email[:25]}")
            sig_y -= 12
            phone = creator.get('phone', 'N/A')
            p.drawString(col1_x, sig_y, f"Tel: {phone}")
        
        # Tenant signature (right)
        sig_y = y_position
        try:
            p.setFont("DejaVu-Bold", 11)
        except:
            p.setFont("Helvetica-Bold", 11)
        
        p.drawString(col2_x, sig_y, "Подпись Нанимателя:")
        sig_y -= 20
        
        try:
            p.setFont("DejaVu-Mono", 10)
        except:
            p.setFont("Courier-Bold", 10)
        
        if signature.get('signature_hash'):
            p.drawString(col2_x, sig_y, signature['signature_hash'])
            sig_y -= 18
        
        try:
            p.setFont("DejaVu", 9)
        except:
            p.setFont("Helvetica", 9)
        
        signer = contract['signer_name']
        p.drawString(col2_x, sig_y, signer[:30])
        sig_y -= 12
        if contract.get('signer_email'):
            p.drawString(col2_x, sig_y, f"Email: {contract['signer_email'][:25]}")
            sig_y -= 12
        p.drawString(col2_x, sig_y, f"Tel: {contract['signer_phone']}")
        
        # Date
        y_position -= 100
        try:
            p.setFont("DejaVu", 10)
        except:
            p.setFont("Helvetica", 10)
        
        signed_date = contract.get('approved_at', datetime.now(timezone.utc).isoformat())
        try:
            if isinstance(signed_date, str):
                date_obj = datetime.fromisoformat(signed_date)
                date_str = date_obj.strftime('%d.%m.%Y')
            else:
                date_str = signed_date.strftime('%d.%m.%Y')
        except:
            date_str = str(signed_date)[:10]
        
        p.drawCentredString(width / 2, y_position, f"Дата подписания: {date_str}")
        
        # Document photo
        if signature.get('document_upload'):
            p.showPage()
            y_position = height - 60
            
            try:
                try:
                    p.setFont("DejaVu-Bold", 14)
                except:
                    p.setFont("Helvetica-Bold", 14)
                
                p.drawString(50, y_position, "Документ подписанта:")
                y_position -= 30
                
                # Decode image
                img_data = base64.b64decode(signature['document_upload'])
                img_buffer = BytesIO(img_data)
                
                # Load with PIL
                from PIL import Image as PILImage
                pil_img = PILImage.open(img_buffer)
                
                # Convert to RGB
                if pil_img.mode != 'RGB':
                    pil_img = pil_img.convert('RGB')
                
                # Save to new buffer
                img_buffer2 = BytesIO()
                pil_img.save(img_buffer2, format='JPEG')
                img_buffer2.seek(0)
                
                img = ImageReader(img_buffer2)
                
                # Calculate size
                img_width = 400
                img_height = 300
                
                # Draw image
                p.drawImage(img, 100, y_position - img_height - 20, 
                           width=img_width, height=img_height, 
                           preserveAspectRatio=True, mask='auto')
                
            except Exception as e:
                logging.error(f"Error processing document image: {str(e)}")
                try:
                    p.setFont("DejaVu", 10)
                except:
                    p.setFont("Helvetica", 10)
                p.drawString(50, y_position - 20, "Ошибка загрузки изображения")
    
    p.save()
    buffer.seek(0)
    
    await log_audit("pdf_downloaded", contract_id=contract_id, user_id=current_user['user_id'])
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=contract-{contract_id}.pdf"}
    )

# ===== ADMIN ROUTES =====
@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/admin/contracts")
async def get_all_contracts(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    contracts = await db.contracts.find({}, {"_id": 0}).to_list(1000)
    return contracts

@api_router.get("/admin/audit-logs")
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return logs

@api_router.get("/admin/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_contracts = await db.contracts.count_documents({})
    signed_contracts = await db.contracts.count_documents({"status": "signed"})
    pending_contracts = await db.contracts.count_documents({"status": "pending-signature"})
    
    return {
        "total_users": total_users,
        "total_contracts": total_contracts,
        "signed_contracts": signed_contracts,
        "pending_contracts": pending_contracts
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
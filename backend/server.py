from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import resend
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

logger = logging.getLogger(__name__)

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "Staff"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    customer_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[EmailStr] = None
    phone: str
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    address: Optional[str] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Tax(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tax_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    percentage: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaxCreate(BaseModel):
    name: str
    percentage: float

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    category_id: str
    tax_ids: List[str]
    buy_price: Optional[float] = None
    sell_price: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    code: str
    category_id: str
    tax_ids: List[str]
    buy_price: Optional[float] = None
    sell_price: float

class WashZone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    zone_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WashZoneCreate(BaseModel):
    name: str
    is_active: bool = True

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    booking_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_number: Optional[int] = None
    customer_id: str
    zone_id: str
    product_ids: List[str]
    appointment_datetime: datetime
    duration_minutes: int = 60
    vehicle_pickup_by_us: bool = False
    vehicle_dropoff_by_us: bool = False
    status: str = "Pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class BookingCreate(BaseModel):
    customer_id: str
    zone_id: str
    product_ids: List[str]
    appointment_datetime: datetime
    duration_minutes: int = 60
    vehicle_pickup_by_us: bool = False
    vehicle_dropoff_by_us: bool = False

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    customer_id: Optional[str] = None
    appointment_datetime: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    vehicle_pickup_by_us: Optional[bool] = None
    vehicle_dropoff_by_us: Optional[bool] = None
    product_ids: Optional[List[str]] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    settings_id: str = "default"
    currency: str = "USD"
    show_tax_bifurcation: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    currency: Optional[str] = None
    show_tax_bifurcation: Optional[bool] = None

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invoice_id: str
    invoice_number: Optional[int] = None
    invoice_prefix: Optional[str] = ""
    booking_id: str
    customer_id: str
    items: List[dict]
    subtotal: float
    tax_amount: float
    discount_percentage: float = 0.0
    discount_amount: float = 0.0
    total: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class InvoiceCreate(BaseModel):
    booking_id: str
    discount_percentage: float = 0.0
    invoice_prefix: str = ""
    product_ids: Optional[List[str]] = None  # Optional: if provided, will update booking and use these products

class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str

# Auth functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    doc = user.model_dump()
    doc['password_hash'] = hash_password(user_data.password)
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    token = create_token({"user_id": user.user_id, "email": user.email, "role": user.role})
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user_doc.pop('password_hash', None)
    user = User(**user_doc)
    
    token = create_token({"user_id": user.user_id, "email": user.email, "role": user.role})
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Customer routes
@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: User = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    for c in customers:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return customers

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, current_user: User = Depends(get_current_user)):
    customer = Customer(**customer_data.model_dump())
    doc = customer.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.customers.insert_one(doc)
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerCreate, current_user: User = Depends(get_current_user)):
    result = await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = customer_data.model_dump()
    await db.customers.update_one({"customer_id": customer_id}, {"$set": update_data})
    
    updated = await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Customer(**updated)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.customers.delete_one({"customer_id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}

@api_router.get("/customers/search/{query}")
async def search_customers(query: str, current_user: User = Depends(get_current_user)):
    customers = await db.customers.find({
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"phone": {"$regex": query, "$options": "i"}}
        ]
    }, {"_id": 0}).limit(10).to_list(10)
    
    for c in customers:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    
    return customers

# Category routes
@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: User = Depends(get_current_user)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    for c in categories:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: User = Depends(get_current_user)):
    category = Category(**category_data.model_dump())
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.categories.insert_one(doc)
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: User = Depends(get_current_user)):
    result = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category_data.model_dump()
    await db.categories.update_one({"category_id": category_id}, {"$set": update_data})
    
    updated = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# Tax routes
@api_router.get("/taxes", response_model=List[Tax])
async def get_taxes(current_user: User = Depends(get_current_user)):
    taxes = await db.taxes.find({}, {"_id": 0}).to_list(1000)
    for t in taxes:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    return taxes

@api_router.post("/taxes", response_model=Tax)
async def create_tax(tax_data: TaxCreate, current_user: User = Depends(get_current_user)):
    tax = Tax(**tax_data.model_dump())
    doc = tax.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.taxes.insert_one(doc)
    return tax

@api_router.put("/taxes/{tax_id}", response_model=Tax)
async def update_tax(tax_id: str, tax_data: TaxCreate, current_user: User = Depends(get_current_user)):
    result = await db.taxes.find_one({"tax_id": tax_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Tax not found")
    
    update_data = tax_data.model_dump()
    await db.taxes.update_one({"tax_id": tax_id}, {"$set": update_data})
    
    updated = await db.taxes.find_one({"tax_id": tax_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Tax(**updated)

@api_router.delete("/taxes/{tax_id}")
async def delete_tax(tax_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.taxes.delete_one({"tax_id": tax_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tax not found")
    return {"message": "Tax deleted"}

# Product routes
@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: User = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    for p in products:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return products

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    product = Product(**product_data.model_dump())
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.products.insert_one(doc)
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    result = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_data.model_dump()
    await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    
    updated = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Product(**updated)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# Wash Zone routes
@api_router.get("/zones", response_model=List[WashZone])
async def get_zones(current_user: User = Depends(get_current_user)):
    zones = await db.zones.find({}, {"_id": 0}).to_list(1000)
    for z in zones:
        if isinstance(z.get('created_at'), str):
            z['created_at'] = datetime.fromisoformat(z['created_at'])
    return zones

@api_router.post("/zones", response_model=WashZone)
async def create_zone(zone_data: WashZoneCreate, current_user: User = Depends(get_current_user)):
    zone = WashZone(**zone_data.model_dump())
    doc = zone.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.zones.insert_one(doc)
    return zone

@api_router.put("/zones/{zone_id}", response_model=WashZone)
async def update_zone(zone_id: str, zone_data: WashZoneCreate, current_user: User = Depends(get_current_user)):
    result = await db.zones.find_one({"zone_id": zone_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    update_data = zone_data.model_dump()
    await db.zones.update_one({"zone_id": zone_id}, {"$set": update_data})
    
    updated = await db.zones.find_one({"zone_id": zone_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return WashZone(**updated)

@api_router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.zones.delete_one({"zone_id": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    return {"message": "Zone deleted"}

# Zone availability check
@api_router.get("/zones/available")
async def get_available_zones(
    appointment_datetime: str,
    duration_minutes: int = 60,
    current_user: User = Depends(get_current_user)
):
    """Get list of available zones for a given appointment time"""
    try:
        # Handle 'Z' timezone indicator (UTC) - replace with +00:00 for fromisoformat
        dt_string = appointment_datetime.replace('Z', '+00:00') if appointment_datetime.endswith('Z') else appointment_datetime
        appointment_start = datetime.fromisoformat(dt_string)
        appointment_end = appointment_start + timedelta(minutes=duration_minutes)
    except (ValueError, AttributeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid appointment_datetime format: {str(e)}")
    
    # Get all active zones
    all_zones = await db.zones.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    # If no active zones exist, return empty list
    if not all_zones:
        return {"available_zones": [], "total_available": 0}
    
    # Get all bookings that might conflict
    all_bookings = await db.bookings.find({
        "status": {"$ne": "Cancelled"}
    }, {"_id": 0}).to_list(10000)
    
    available_zones = []
    
    for zone in all_zones:
        zone_id = zone['zone_id']
        is_available = True
        
        # Check if any booking in this zone overlaps with the requested time
        for booking in all_bookings:
            if booking.get('zone_id') != zone_id:
                continue
                
            existing_start = booking.get('appointment_datetime')
            if existing_start is None:
                continue
                
            if isinstance(existing_start, str):
                try:
                    # Handle both 'Z' and regular ISO format
                    dt_str = existing_start.replace('Z', '+00:00') if existing_start.endswith('Z') else existing_start
                    existing_start = datetime.fromisoformat(dt_str)
                except (ValueError, AttributeError) as e:
                    logger.warning(f"Failed to parse booking datetime {existing_start}: {e}")
                    continue
            elif not isinstance(existing_start, datetime):
                continue
            
            existing_duration = booking.get('duration_minutes', 60)
            existing_end = existing_start + timedelta(minutes=existing_duration)
            
            # Check if time slots overlap
            if (appointment_start < existing_end and appointment_end > existing_start):
                is_available = False
                break
        
        if is_available:
            available_zones.append(zone)
    
    logger.info(f"Zone availability check: {len(available_zones)}/{len(all_zones)} zones available for {appointment_datetime}")
    return {"available_zones": available_zones, "total_available": len(available_zones)}

# Booking routes
@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(
    customer_search: Optional[str] = None,
    appointment_date: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "booking_number",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 50,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    # Customer search filter
    if customer_search:
        customers = await db.customers.find({
            "$or": [
                {"name": {"$regex": customer_search, "$options": "i"}},
                {"phone": {"$regex": customer_search, "$options": "i"}}
            ]
        }, {"_id": 0, "customer_id": 1}).to_list(100)
        customer_ids = [c['customer_id'] for c in customers]
        if customer_ids:
            query["customer_id"] = {"$in": customer_ids}
        else:
            return []
    
    # Appointment date filter
    if appointment_date:
        date_obj = datetime.fromisoformat(appointment_date)
        start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
        query["appointment_datetime"] = {
            "$gte": start_of_day.isoformat(),
            "$lte": end_of_day.isoformat()
        }
    
    # Status filter
    if status and status != "all":
        query["status"] = status
    
    # Sort configuration
    sort_field = "booking_number" if sort_by == "booking_number" else "appointment_datetime"
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Get total count for pagination
    total = await db.bookings.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * page_size
    bookings = await db.bookings.find(query, {"_id": 0}).sort(sort_field, sort_direction).skip(skip).limit(page_size).to_list(page_size)
    
    for b in bookings:
        if isinstance(b.get('created_at'), str):
            b['created_at'] = datetime.fromisoformat(b['created_at'])
        if isinstance(b.get('appointment_datetime'), str):
            b['appointment_datetime'] = datetime.fromisoformat(b['appointment_datetime'])
    
    return bookings

@api_router.get("/bookings/count")
async def get_bookings_count(
    customer_search: Optional[str] = None,
    appointment_date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if customer_search:
        customers = await db.customers.find({
            "$or": [
                {"name": {"$regex": customer_search, "$options": "i"}},
                {"phone": {"$regex": customer_search, "$options": "i"}}
            ]
        }, {"_id": 0, "customer_id": 1}).to_list(100)
        customer_ids = [c['customer_id'] for c in customers]
        if customer_ids:
            query["customer_id"] = {"$in": customer_ids}
        else:
            return {"total": 0}
    
    if appointment_date:
        date_obj = datetime.fromisoformat(appointment_date)
        start_of_day = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
        query["appointment_datetime"] = {
            "$gte": start_of_day.isoformat(),
            "$lte": end_of_day.isoformat()
        }
    
    if status and status != "all":
        query["status"] = status
    
    total = await db.bookings.count_documents(query)
    return {"total": total}

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: User = Depends(get_current_user)):
    # Get next booking number
    last_booking = await db.bookings.find_one({}, {"_id": 0}, sort=[("booking_number", -1)])
    next_booking_number = (last_booking.get('booking_number', 0) + 1) if last_booking else 1
    
    # Check for double booking
    appointment_start = booking_data.appointment_datetime
    appointment_end = appointment_start + timedelta(minutes=booking_data.duration_minutes)
    
    # Find overlapping bookings in the same zone
    all_bookings = await db.bookings.find({
        "zone_id": booking_data.zone_id,
        "status": {"$ne": "Cancelled"}
    }, {"_id": 0}).to_list(1000)
    
    for existing_booking in all_bookings:
        existing_start = existing_booking['appointment_datetime']
        if isinstance(existing_start, str):
            existing_start = datetime.fromisoformat(existing_start)
        
        existing_duration = existing_booking.get('duration_minutes', 60)
        existing_end = existing_start + timedelta(minutes=existing_duration)
        
        # Check if time slots overlap
        if (appointment_start < existing_end and appointment_end > existing_start):
            raise HTTPException(
                status_code=400, 
                detail=f"Zone is already booked from {existing_start.strftime('%Y-%m-%d %H:%M')} to {existing_end.strftime('%H:%M')}"
            )
    
    booking = Booking(**booking_data.model_dump(), created_by=current_user.user_id, booking_number=next_booking_number)
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['appointment_datetime'] = doc['appointment_datetime'].isoformat()
    await db.bookings.insert_one(doc)
    
    customer = await db.customers.find_one({"customer_id": booking.customer_id}, {"_id": 0})
    if customer and customer.get('email') and resend.api_key:
        try:
            html_content = f"""
            <h2>Booking Confirmation</h2>
            <p>Dear {customer.get('name', 'Customer')},</p>
            <p>Your booking has been confirmed.</p>
            <p><strong>Booking Number:</strong> {booking.booking_number}</p>
            <p><strong>Appointment:</strong> {booking.appointment_datetime.strftime('%Y-%m-%d %H:%M')}</p>
            <p><strong>Duration:</strong> {booking.duration_minutes} minutes</p>
            <p>Thank you for choosing our service!</p>
            """
            await asyncio.to_thread(
                resend.Emails.send,
                {
                    "from": SENDER_EMAIL,
                    "to": [customer['email']],
                    "subject": "Booking Confirmation",
                    "html": html_content
                }
            )
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
    
    return booking

@api_router.put("/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, update_data: BookingUpdate, current_user: User = Depends(get_current_user)):
    result = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update_dict = {}
    
    # Check for double booking if appointment_datetime or duration is being updated
    if update_data.appointment_datetime or update_data.duration_minutes:
        zone_id = result['zone_id']
        
        appointment_start = update_data.appointment_datetime if update_data.appointment_datetime else datetime.fromisoformat(result['appointment_datetime']) if isinstance(result['appointment_datetime'], str) else result['appointment_datetime']
        duration = update_data.duration_minutes if update_data.duration_minutes else result.get('duration_minutes', 60)
        appointment_end = appointment_start + timedelta(minutes=duration)
        
        # Find overlapping bookings in the same zone
        all_bookings = await db.bookings.find({
            "zone_id": zone_id,
            "booking_id": {"$ne": booking_id},
            "status": {"$ne": "Cancelled"}
        }, {"_id": 0}).to_list(1000)
        
        for existing_booking in all_bookings:
            existing_start = existing_booking['appointment_datetime']
            if isinstance(existing_start, str):
                existing_start = datetime.fromisoformat(existing_start)
            
            existing_duration = existing_booking.get('duration_minutes', 60)
            existing_end = existing_start + timedelta(minutes=existing_duration)
            
            # Check if time slots overlap
            if (appointment_start < existing_end and appointment_end > existing_start):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Zone is already booked from {existing_start.strftime('%Y-%m-%d %H:%M')} to {existing_end.strftime('%H:%M')}"
                )
        
        if update_data.appointment_datetime:
            update_dict['appointment_datetime'] = appointment_start.isoformat()
        if update_data.duration_minutes:
            update_dict['duration_minutes'] = duration
    
    if update_data.status:
        update_dict['status'] = update_data.status
    if update_data.customer_id:
        update_dict['customer_id'] = update_data.customer_id
    if update_data.vehicle_pickup_by_us is not None:
        update_dict['vehicle_pickup_by_us'] = update_data.vehicle_pickup_by_us
    if update_data.vehicle_dropoff_by_us is not None:
        update_dict['vehicle_dropoff_by_us'] = update_data.vehicle_dropoff_by_us
    if update_data.product_ids is not None:
        update_dict['product_ids'] = update_data.product_ids
    
    if update_dict:
        await db.bookings.update_one({"booking_id": booking_id}, {"$set": update_dict})
    
    updated = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated['appointment_datetime'], str):
        updated['appointment_datetime'] = datetime.fromisoformat(updated['appointment_datetime'])
    return Booking(**updated)

# Invoice routes
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_user: User = Depends(get_current_user)):
    booking = await db.bookings.find_one({"booking_id": invoice_data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Only Admin and Manager can apply discounts
    if invoice_data.discount_percentage > 0 and current_user.role not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Only Admin and Manager can apply discounts")
    
    # Determine which product_ids to use
    # If product_ids provided and user is Admin/Manager, use them and update booking
    # Otherwise, use booking's existing product_ids
    product_ids_to_use = booking['product_ids']
    if invoice_data.product_ids is not None:
        # Only Admin and Manager can modify services
        if current_user.role not in ["Admin", "Manager"]:
            raise HTTPException(status_code=403, detail="Only Admin and Manager can modify services in invoice")
        product_ids_to_use = invoice_data.product_ids
        # Update booking with new product_ids
        await db.bookings.update_one(
            {"booking_id": invoice_data.booking_id},
            {"$set": {"product_ids": product_ids_to_use}}
        )
    
    # Get next invoice number
    last_invoice = await db.invoices.find_one({}, {"_id": 0}, sort=[("invoice_number", -1)])
    next_invoice_number = (last_invoice.get('invoice_number', 0) + 1) if last_invoice else 1
    
    products = await db.products.find({"product_id": {"$in": product_ids_to_use}}, {"_id": 0}).to_list(100)
    taxes_map = {}
    all_tax_ids = []
    for p in products:
        all_tax_ids.extend(p.get('tax_ids', []))
    
    if all_tax_ids:
        taxes = await db.taxes.find({"tax_id": {"$in": list(set(all_tax_ids))}}, {"_id": 0}).to_list(100)
        taxes_map = {t['tax_id']: t for t in taxes}
    
    items = []
    subtotal = 0.0
    
    for product in products:
        item_price = product['sell_price']
        tax_amount = 0.0
        
        for tax_id in product.get('tax_ids', []):
            if tax_id in taxes_map:
                tax_amount += (item_price * taxes_map[tax_id]['percentage'] / 100)
        
        items.append({
            "product_name": product['name'],
            "price": item_price,
            "tax_amount": tax_amount,
            "total": item_price + tax_amount
        })
        subtotal += item_price
    
    total_tax = sum(item['tax_amount'] for item in items)
    discount_amount = (subtotal + total_tax) * (invoice_data.discount_percentage / 100)
    total = subtotal + total_tax - discount_amount
    
    invoice = Invoice(
        invoice_id=str(uuid.uuid4()),
        invoice_number=next_invoice_number,
        invoice_prefix=invoice_data.invoice_prefix,
        booking_id=invoice_data.booking_id,
        customer_id=booking['customer_id'],
        items=items,
        subtotal=subtotal,
        tax_amount=total_tax,
        discount_percentage=invoice_data.discount_percentage,
        discount_amount=discount_amount,
        total=total,
        created_by=current_user.user_id
    )
    
    doc = invoice.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.invoices.insert_one(doc)
    
    return invoice

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(current_user: User = Depends(get_current_user)):
    invoices = await db.invoices.find({}, {"_id": 0}).sort("invoice_number", -1).to_list(1000)
    for inv in invoices:
        if isinstance(inv.get('created_at'), str):
            inv['created_at'] = datetime.fromisoformat(inv['created_at'])
    return invoices

@api_router.get("/invoices/latest-prefix")
async def get_latest_invoice_prefix(current_user: User = Depends(get_current_user)):
    last_invoice = await db.invoices.find_one({}, {"_id": 0, "invoice_prefix": 1}, sort=[("invoice_number", -1)])
    return {"prefix": last_invoice.get('invoice_prefix', '') if last_invoice else ''}

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if isinstance(invoice['created_at'], str):
        invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    return Invoice(**invoice)

class EmailInvoiceRequest(BaseModel):
    invoice_id: str
    recipient_email: EmailStr

@api_router.post("/invoices/email")
async def email_invoice(request: EmailInvoiceRequest, current_user: User = Depends(get_current_user)):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    
    invoice = await db.invoices.find_one({"invoice_id": request.invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    customer = await db.customers.find_one({"customer_id": invoice['customer_id']}, {"_id": 0})
    
    # Get currency settings
    settings = await db.settings.find_one({"settings_id": "default"}, {"_id": 0})
    currency = settings.get('currency', 'USD') if settings else 'USD'
    
    # Currency symbol mapping
    currency_symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'INR': '₹',
        'AUD': 'A$',
        'CAD': 'C$',
        'JPY': '¥',
        'CNY': '¥'
    }
    currency_symbol = currency_symbols.get(currency, '$')
    
    # Format currency helper
    def format_currency(amount):
        if currency == 'INR':
            # Indian Rupee formatting with commas
            return f"₹{amount:,.2f}"
        else:
            return f"{currency_symbol}{amount:,.2f}"
    
    full_invoice_number = f"{invoice.get('invoice_prefix', '')}{invoice['invoice_number']}"
    invoice_date = datetime.fromisoformat(invoice['created_at']) if isinstance(invoice['created_at'], str) else invoice['created_at']
    formatted_date = invoice_date.strftime('%B %d, %Y') if isinstance(invoice_date, datetime) else str(invoice_date)
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #0066ff;
                padding-bottom: 20px;
            }}
            .header h1 {{
                color: #0066ff;
                margin: 0;
                font-size: 28px;
            }}
            .invoice-info {{
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
            }}
            .invoice-info p {{
                margin: 5px 0;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }}
            th {{
                background-color: #0066ff;
                color: white;
                padding: 12px;
                text-align: left;
            }}
            td {{
                padding: 10px;
                border-bottom: 1px solid #ddd;
            }}
            tr:nth-child(even) {{
                background-color: #f9f9f9;
            }}
            .summary {{
                margin-top: 20px;
                text-align: right;
            }}
            .summary p {{
                margin: 8px 0;
            }}
            .total {{
                font-size: 18px;
                font-weight: bold;
                color: #0066ff;
                border-top: 2px solid #0066ff;
                padding-top: 10px;
                margin-top: 10px;
            }}
            .footer {{
                margin-top: 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Car Logic</h1>
            <h2 style="margin: 10px 0; color: #666;">Car Wash Manager</h2>
        </div>
        
        <p>Dear {customer.get('name', 'Customer') if customer else 'Customer'},</p>
        <p>Thank you for your business! Please find your invoice details below:</p>
        
        <div class="invoice-info">
            <p><strong>Invoice Number:</strong> {full_invoice_number}</p>
            <p><strong>Date:</strong> {formatted_date}</p>
            {f'<p><strong>Customer Phone:</strong> {customer.get("phone", "N/A")}</p>' if customer and customer.get('phone') else ''}
        </div>
        
        <h3>Invoice Items:</h3>
        <table>
            <thead>
                <tr>
                    <th>Service</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Tax</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for item in invoice['items']:
        html_content += f"""
                <tr>
                    <td>{item['product_name']}</td>
                    <td style="text-align: right;">{format_currency(item['price'])}</td>
                    <td style="text-align: right;">{format_currency(item['tax_amount'])}</td>
                    <td style="text-align: right;"><strong>{format_currency(item['total'])}</strong></td>
                </tr>
        """
    
    html_content += f"""
            </tbody>
        </table>
        
        <div class="summary">
            <p><strong>Subtotal:</strong> {format_currency(invoice['subtotal'])}</p>
            <p><strong>Tax:</strong> {format_currency(invoice['tax_amount'])}</p>
    """
    
    if invoice.get('discount_percentage', 0) > 0:
        html_content += f"<p style='color: #28a745;'><strong>Discount ({invoice['discount_percentage']}%):</strong> -{format_currency(invoice['discount_amount'])}</p>"
    
    html_content += f"""
            <p class="total">Total: {format_currency(invoice['total'])}</p>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing Car Logic Car Wash!</p>
            <p>If you have any questions, please contact us.</p>
        </div>
    </body>
    </html>
    """
    
    try:
        email = await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": SENDER_EMAIL,
                "to": [request.recipient_email],
                "subject": f"Invoice {full_invoice_number} from Car Logic",
                "html": html_content
            }
        )
        return {
            "status": "success",
            "message": f"Invoice emailed to {request.recipient_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send invoice email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@api_router.get("/analytics/dashboard")
async def get_analytics(current_user: User = Depends(get_current_user)):
    # Booking analytics
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(10000)
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(10000)
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    
    # Bookings by status
    bookings_by_status = {}
    for booking in bookings:
        status = booking.get('status', 'Unknown')
        bookings_by_status[status] = bookings_by_status.get(status, 0) + 1
    
    # Bookings by month (last 6 months)
    from collections import defaultdict
    bookings_by_month = defaultdict(int)
    for booking in bookings:
        apt_date = booking.get('appointment_datetime')
        if isinstance(apt_date, str):
            apt_date = datetime.fromisoformat(apt_date)
        if apt_date:
            month_key = apt_date.strftime('%Y-%m')
            bookings_by_month[month_key] += 1
    
    # Revenue by month
    revenue_by_month = defaultdict(float)
    for invoice in invoices:
        created = invoice.get('created_at')
        if isinstance(created, str):
            created = datetime.fromisoformat(created)
        if created:
            month_key = created.strftime('%Y-%m')
            revenue_by_month[month_key] += invoice.get('total', 0)
    
    # Zone utilization
    zone_utilization = {}
    for zone in zones:
        zone_bookings = [b for b in bookings if b.get('zone_id') == zone['zone_id']]
        zone_utilization[zone['name']] = len(zone_bookings)
    
    # Customer growth
    customers_by_month = defaultdict(int)
    for customer in customers:
        created = customer.get('created_at')
        if isinstance(created, str):
            created = datetime.fromisoformat(created)
        if created:
            month_key = created.strftime('%Y-%m')
            customers_by_month[month_key] += 1
    
    return {
        "bookings_by_status": bookings_by_status,
        "bookings_by_month": dict(sorted(bookings_by_month.items())[-6:]),
        "revenue_by_month": dict(sorted(revenue_by_month.items())[-6:]),
        "zone_utilization": zone_utilization,
        "customers_by_month": dict(sorted(customers_by_month.items())[-6:]),
        "total_revenue": sum(inv.get('total', 0) for inv in invoices)
    }

@api_router.post("/send-email")
async def send_email(request: EmailRequest, current_user: User = Depends(get_current_user)):
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Email service not configured")
    
    params = {
        "from": SENDER_EMAIL,
        "to": [request.recipient_email],
        "subject": request.subject,
        "html": request.html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {
            "status": "success",
            "message": f"Email sent to {request.recipient_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    doc = user.model_dump()
    doc['password_hash'] = hash_password(user_data.password)
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user

class UserUpdate(BaseModel):
    name: str
    role: str

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, update_data: UserUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"user_id": user_id}, 
        {"$set": {"name": update_data.name, "role": update_data.role}}
    )
    
    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return User(**updated)

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_customers = await db.customers.count_documents({})
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "Pending"})
    completed_bookings = await db.bookings.count_documents({"status": "Completed"})
    total_zones = await db.zones.count_documents({})
    active_zones = await db.zones.count_documents({"is_active": True})
    
    return {
        "total_customers": total_customers,
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "completed_bookings": completed_bookings,
        "total_zones": total_zones,
        "active_zones": active_zones
    }

# Settings routes
@api_router.get("/settings", response_model=Settings)
async def get_settings():
    """Get application settings (public endpoint for currency display)"""
    settings = await db.settings.find_one({"settings_id": "default"}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = Settings()
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return default_settings
    
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return Settings(**settings)

@api_router.put("/settings", response_model=Settings)
async def update_settings(update_data: SettingsUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can update settings")
    
    settings = await db.settings.find_one({"settings_id": "default"}, {"_id": 0})
    if not settings:
        settings = Settings().model_dump()
        settings['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.settings.insert_one(settings)
    
    update_dict = {}
    if update_data.currency:
        update_dict['currency'] = update_data.currency
    if update_data.show_tax_bifurcation is not None:
        update_dict['show_tax_bifurcation'] = update_data.show_tax_bifurcation
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one({"settings_id": "default"}, {"$set": update_dict})
    
    updated = await db.settings.find_one({"settings_id": "default"}, {"_id": 0})
    if isinstance(updated['updated_at'], str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return Settings(**updated)

# Cancel booking
@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, current_user: User = Depends(get_current_user)):
    result = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"status": "Cancelled"}})
    
    updated = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated['appointment_datetime'], str):
        updated['appointment_datetime'] = datetime.fromisoformat(updated['appointment_datetime'])
    return Booking(**updated)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
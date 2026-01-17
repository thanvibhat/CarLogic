import sys
import os
from pathlib import Path

# Add backend directory to path
BACKEND_DIR = Path(__file__).parent.parent / 'backend'
sys.path.append(str(BACKEND_DIR))

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
from dotenv import load_dotenv

ROOT_DIR = BACKEND_DIR
env_path = ROOT_DIR / '.env'
print(f"Loading .env from: {env_path}")
print(f"File exists: {env_path.exists()}")
load_dotenv(env_path, override=True)

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

if not mongo_url or not db_name:
    raise ValueError(f"Missing environment variables. MONGO_URL: {mongo_url}, DB_NAME: {db_name}")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if admin exists (check both old and new domain)
    existing_admin = await db.users.find_one({"$or": [{"email": "admin@carlogic.com"}, {"email": "admin@hydroflow.com"}]})
    
    if not existing_admin:
        admin_user = {
            "user_id": "admin-001",
            "email": "admin@carlogic.com",
            "name": "Admin User",
            "role": "Admin",
            "password_hash": pwd_context.hash("admin123"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        print("[OK] Admin user created (admin@carlogic.com / admin123)")
    else:
        # Update email if using old domain
        if existing_admin.get('email') == 'admin@hydroflow.com':
            await db.users.update_one({"email": "admin@hydroflow.com"}, {"$set": {"email": "admin@carlogic.com"}})
            print("[OK] Admin user email updated to admin@carlogic.com")
        else:
            print("[OK] Admin user already exists")
    
    # Check if manager exists
    existing_manager = await db.users.find_one({"$or": [{"email": "manager@carlogic.com"}, {"email": "manager@hydroflow.com"}]})
    
    if not existing_manager:
        manager_user = {
            "user_id": "manager-001",
            "email": "manager@carlogic.com",
            "name": "Manager User",
            "role": "Manager",
            "password_hash": pwd_context.hash("manager123"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(manager_user)
        print("[OK] Manager user created (manager@carlogic.com / manager123)")
    else:
        if existing_manager.get('email') == 'manager@hydroflow.com':
            await db.users.update_one({"email": "manager@hydroflow.com"}, {"$set": {"email": "manager@carlogic.com"}})
            print("[OK] Manager user email updated to manager@carlogic.com")
        else:
            print("[OK] Manager user already exists")
    
    # Check if staff exists
    existing_staff = await db.users.find_one({"$or": [{"email": "staff@carlogic.com"}, {"email": "staff@hydroflow.com"}]})
    
    if not existing_staff:
        staff_user = {
            "user_id": "staff-001",
            "email": "staff@carlogic.com",
            "name": "Staff User",
            "role": "Staff",
            "password_hash": pwd_context.hash("staff123"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(staff_user)
        print("[OK] Staff user created (staff@carlogic.com / staff123)")
    else:
        if existing_staff.get('email') == 'staff@hydroflow.com':
            await db.users.update_one({"email": "staff@hydroflow.com"}, {"$set": {"email": "staff@carlogic.com"}})
            print("[OK] Staff user email updated to staff@carlogic.com")
        else:
            print("[OK] Staff user already exists")
    
    # Seed categories
    categories_count = await db.categories.count_documents({})
    if categories_count == 0:
        categories = [
            {"category_id": "cat-001", "name": "Basic Wash", "description": "Standard washing services", "created_at": datetime.now(timezone.utc).isoformat()},
            {"category_id": "cat-002", "name": "Premium Wash", "description": "Premium detailing services", "created_at": datetime.now(timezone.utc).isoformat()},
            {"category_id": "cat-003", "name": "Detailing", "description": "Complete car detailing", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.categories.insert_many(categories)
        print("[OK] Sample categories created")
    
    # Seed taxes
    taxes_count = await db.taxes.count_documents({})
    if taxes_count == 0:
        taxes = [
            {"tax_id": "tax-001", "name": "GST", "percentage": 18.0, "created_at": datetime.now(timezone.utc).isoformat()},
            {"tax_id": "tax-002", "name": "Service Tax", "percentage": 5.0, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.taxes.insert_many(taxes)
        print("[OK] Sample taxes created")
    
    # Seed zones
    zones_count = await db.zones.count_documents({})
    if zones_count == 0:
        zones = [
            {"zone_id": "zone-001", "name": "Zone A", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"zone_id": "zone-002", "name": "Zone B", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"zone_id": "zone-003", "name": "Zone C", "is_active": False, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.zones.insert_many(zones)
        print("[OK] Sample wash zones created")
    
    client.close()
    print("\n[OK] Database seeding completed!")
    print("\nDefault Login Credentials:")
    print("Admin: admin@carlogic.com / admin123")
    print("Manager: manager@carlogic.com / manager123")
    print("Staff: staff@carlogic.com / staff123")

if __name__ == "__main__":
    asyncio.run(seed_database())

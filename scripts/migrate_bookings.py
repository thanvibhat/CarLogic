import sys
sys.path.append('/app/backend')

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path('/app/backend')
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def migrate_bookings():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Find bookings without duration_minutes
    bookings = await db.bookings.find({"duration_minutes": {"$exists": False}}).to_list(1000)
    
    if bookings:
        print(f"Found {len(bookings)} bookings to migrate")
        
        for booking in bookings:
            await db.bookings.update_one(
                {"booking_id": booking['booking_id']},
                {"$set": {"duration_minutes": 60}}
            )
        
        print(f"✓ Migrated {len(bookings)} bookings with default 60-minute duration")
    else:
        print("✓ No bookings need migration")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_bookings())

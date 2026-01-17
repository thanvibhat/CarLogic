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

async def migrate_booking_numbers():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Find bookings without booking_number
    bookings = await db.bookings.find({"booking_number": {"$exists": False}}).sort("created_at", 1).to_list(1000)
    
    if bookings:
        print(f"Found {len(bookings)} bookings to migrate")
        
        for idx, booking in enumerate(bookings, start=1):
            await db.bookings.update_one(
                {"booking_id": booking['booking_id']},
                {"$set": {"booking_number": idx}}
            )
            print(f"Updated booking {booking['booking_id']} with number {idx}")
        
        print(f"✓ Migrated {len(bookings)} bookings with sequential numbers")
    else:
        print("✓ No bookings need migration")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_booking_numbers())

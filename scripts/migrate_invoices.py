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

async def migrate_invoices():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Find invoices without invoice_number
    invoices = await db.invoices.find({"invoice_number": {"$exists": False}}).to_list(1000)
    
    if invoices:
        print(f"Found {len(invoices)} invoices to migrate")
        
        # Sort by created_at to assign sequential numbers
        invoices.sort(key=lambda x: x.get('created_at', ''))
        
        for idx, invoice in enumerate(invoices, start=1):
            await db.invoices.update_one(
                {"invoice_id": invoice['invoice_id']},
                {"$set": {"invoice_number": idx, "invoice_prefix": ""}}
            )
            print(f"Updated invoice {invoice['invoice_id']} with number {idx}")
        
        print(f"✓ Migrated {len(invoices)} invoices")
    else:
        print("✓ No invoices need migration")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_invoices())

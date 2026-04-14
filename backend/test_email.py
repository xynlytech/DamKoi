import asyncio
import sys
import os

# Add the current directory to path so we can import app
sys.path.append(os.getcwd())

from app.services.mailer import mailer
from app.config import settings

async def test_email():
    print("📧 Testing Resend Email Connection...")
    print(f"   API Key configured: {bool(settings.RESEND_API_KEY)}")
    print(f"   Sending from: {settings.EMAIL_FROM}")
    
    # We'll use a test email address
    test_email = "onboarding@resend.dev" # Since it's a test environment
    
    success = mailer.send_price_drop_email(
        to_email=test_email,
        product_title="Test Product - DamKoi",
        product_url="https://www.daraz.com.bd",
        current_price=1500.0,
        target_price=1600.0
    )
    
    if success:
        print("✅ Success! Check your Resend dashboard logs.")
    else:
        print("❌ Failed. Check console for errors.")

if __name__ == "__main__":
    asyncio.run(test_email())

"""
DamKoi — Payments Router (MVP)

Handles Premium Tier subscription upgrades.
Currently uses a mock checkout flow that simulates a successful payment.
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User

router = APIRouter()

class CheckoutRequest(BaseModel):
    user_id: str
    plan_id: str = "premium_monthly"


@router.post("/create-checkout", tags=["Payments"])
async def create_checkout_session(payload: CheckoutRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate a mock checkout URL. In a real scenario, this calls SSLCommerz/Stripe API.
    For MVP, we just return a success URL that simulates completion.
    """
    # Verify user exists
    user_res = await db.execute(select(User).where(User.id == payload.user_id))
    user = user_res.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Mock checkout URL that the frontend can redirect to or process
    mock_url = f"http://localhost:3000/en/premium?status=success&user_id={payload.user_id}"
    
    return {
        "checkout_url": mock_url,
        "session_id": "mock_session_12345"
    }


class WebhookPayload(BaseModel):
    user_id: str
    status: str
    amount: int


@router.post("/webhook", tags=["Payments"])
async def payment_webhook(payload: WebhookPayload, db: AsyncSession = Depends(get_db)):
    """
    Webhook receiver for payment gateway.
    Upgrades the user to premium if status is success.
    """
    if payload.status != "success":
        return {"status": "ignored", "reason": "Not a successful payment"}

    user_res = await db.execute(select(User).where(User.id == payload.user_id))
    user = user_res.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_premium = True
    user.premium_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    await db.commit()
    
    return {"status": "success", "message": "User upgraded to Premium"}

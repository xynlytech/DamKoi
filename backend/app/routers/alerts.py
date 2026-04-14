"""
DamKoi — Alerts Router

CRUD for price drop alerts. Free tier: 3 active alerts per user.
Notifications via Resend email (Phase 1).
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.alert import Alert
from app.models.product import Product

router = APIRouter(prefix="/alerts", tags=["Alerts"])

# Free tier alert limit
FREE_ALERT_LIMIT = 3


# ── Pydantic Schemas ──────────────────────────────────────────


class CreateAlertRequest(BaseModel):
    product_id: UUID
    target_price: int = Field(..., gt=0, description="Target price in BDT paisa")
    email: Optional[str] = Field(None, description="Email to notify (for anonymous users)")
    notify_via: list[str] = ["email"]


class UpdateAlertRequest(BaseModel):
    target_price: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None


class AlertResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_title: Optional[str] = None
    target_price: int
    notify_via: list[str]
    is_active: bool
    email: Optional[str] = None
    last_triggered: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────


@router.post("", response_model=AlertResponse, status_code=201)
async def create_alert(
    body: CreateAlertRequest,
    user_id: Optional[UUID] = Query(None, description="User ID (if authenticated)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a price drop alert for a product.
    Supports both authenticated users (via user_id) and anonymous users (via email).
    """
    from app.models.user import User
    
    # 1. Resolve User
    target_user = None
    if user_id:
        user_result = await db.execute(select(User).where(User.id == user_id))
        target_user = user_result.scalar_one_or_none()
    
    if not target_user and body.email:
        # Find or create shadow user by email
        user_result = await db.execute(select(User).where(User.email == body.email))
        target_user = user_result.scalar_one_or_none()
        
        if not target_user:
            target_user = User(email=body.email, auth_provider="shadow")
            db.add(target_user)
            await db.flush()
    
    if not target_user:
        raise HTTPException(
            status_code=400, 
            detail="Either user_id or email must be provided to create an alert."
        )

    # 2. Check free tier limit
    active_count = await db.execute(
        select(func.count(Alert.id)).where(
            and_(Alert.user_id == target_user.id, Alert.is_active == True)
        )
    )
    count = active_count.scalar()

    if count >= FREE_ALERT_LIMIT:
        raise HTTPException(
            status_code=403,
            detail=f"Free tier limit: {FREE_ALERT_LIMIT} active alerts. "
                   "Upgrade to Premium for unlimited alerts."
        )

    # 3. Verify product exists
    product_result = await db.execute(
        select(Product).where(Product.id == body.product_id)
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    # 4. Create alert
    alert = Alert(
        user_id=target_user.id,
        product_id=body.product_id,
        target_price=body.target_price,
        notify_via=body.notify_via,
    )
    db.add(alert)
    await db.flush()

    return AlertResponse(
        id=alert.id,
        product_id=alert.product_id,
        product_title=product.title,
        target_price=alert.target_price,
        notify_via=alert.notify_via,
        is_active=alert.is_active,
        email=target_user.email,
        last_triggered=alert.last_triggered,
        created_at=alert.created_at,
    )


@router.get("", response_model=list[AlertResponse])
async def get_user_alerts(
    user_id: UUID = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get all alerts for a user."""
    result = await db.execute(
        select(Alert, Product.title)
        .join(Product, Alert.product_id == Product.id)
        .where(Alert.user_id == user_id)
        .order_by(Alert.created_at.desc())
    )
    rows = result.all()

    return [
        AlertResponse(
            id=alert.id,
            product_id=alert.product_id,
            product_title=title,
            target_price=alert.target_price,
            notify_via=alert.notify_via,
            is_active=alert.is_active,
            last_triggered=alert.last_triggered,
            created_at=alert.created_at,
        )
        for alert, title in rows
    ]


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: UUID,
    body: UpdateAlertRequest,
    user_id: UUID = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db),
):
    """Update an alert's target price or active status."""
    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == user_id))
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    if body.target_price is not None:
        alert.target_price = body.target_price
    if body.is_active is not None:
        alert.is_active = body.is_active

    await db.flush()

    return AlertResponse(
        id=alert.id,
        product_id=alert.product_id,
        target_price=alert.target_price,
        notify_via=alert.notify_via,
        is_active=alert.is_active,
        last_triggered=alert.last_triggered,
        created_at=alert.created_at,
    )


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: UUID,
    user_id: UUID = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db),
):
    """Delete an alert."""
    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == user_id))
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    await db.delete(alert)

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
    product_image: Optional[str] = None
    current_price: Optional[int] = None
    target_price: int
    notify_via: list[str]
    is_active: bool
    email: Optional[str] = None
    last_triggered: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────


from fastapi import APIRouter, Depends, HTTPException, Query, Request
from app.auth_middleware import get_current_user, security
from fastapi.security import HTTPAuthorizationCredentials

@router.post("", response_model=AlertResponse, status_code=201)
async def create_alert(
    request: Request,
    body: CreateAlertRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a price drop alert for a product.
    Supports both authenticated users (via Bearer token) and anonymous users (via email).
    """
    from app.models.user import User
    
    # 1. Resolve User (Token > Email)
    target_user = None
    
    # Check for Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            # We reuse the logic from get_current_user but inside here to allow fallback
            token = auth_header.split(" ")[1]
            import jwt
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
            user_id = payload.get("sub")
            if user_id:
                user_result = await db.execute(select(User).where(User.id == user_id))
                target_user = user_result.scalar_one_or_none()
        except Exception:
            # If token is invalid, we don't 401 yet, maybe they want to use email
            pass
    
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
            status_code=401, 
            detail="Authentication required: please login or provide an email."
        )

    # 2. Check free tier limit
    if not target_user.is_premium:
        active_count = await db.execute(
            select(func.count(Alert.id)).where(
                and_(Alert.user_id == target_user.id, Alert.is_active == True)
            )
        )
        count = active_count.scalar()

        if count >= FREE_ALERT_LIMIT:
            raise HTTPException(
                status_code=402,
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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all alerts for the authenticated user."""
    # Subquery for latest price
    latest_price_subq = (
        select(
            PriceSnapshot.product_id,
            PriceSnapshot.price,
            func.row_number()
            .over(
                partition_by=PriceSnapshot.product_id,
                order_by=PriceSnapshot.scraped_at.desc()
            )
            .label("rn"),
        )
        .subquery()
    )

    result = await db.execute(
        select(Alert, Product.title, Product.image_url, latest_price_subq.c.price)
        .join(Product, Alert.product_id == Product.id)
        .outerjoin(
            latest_price_subq,
            and_(
                Product.id == latest_price_subq.c.product_id,
                latest_price_subq.c.rn == 1,
            ),
        )
        .where(Alert.user_id == user.id)
        .order_by(Alert.created_at.desc())
    )
    rows = result.all()

    return [
        AlertResponse(
            id=alert.id,
            product_id=alert.product_id,
            product_title=title,
            product_image=image_url,
            current_price=price,
            target_price=alert.target_price,
            notify_via=alert.notify_via,
            is_active=alert.is_active,
            last_triggered=alert.last_triggered,
            created_at=alert.created_at,
        )
        for alert, title, image_url, price in rows
    ]


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: UUID,
    body: UpdateAlertRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an alert's target price or active status."""
    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == user.id))
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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an alert."""
    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == user.id))
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    await db.delete(alert)


# ── Email-based endpoints (for anonymous / no-auth web flow) ──


@router.get("/by-email", response_model=list[AlertResponse])
async def get_alerts_by_email(
    email: str = Query(..., description="Email address used when creating the alert"),
    db: AsyncSession = Depends(get_db),
):
    """Get alerts for a shadow user by email (no auth required)."""
    from app.models.user import User
    from app.models.price_snapshot import PriceSnapshot

    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        return []

    latest_price_subq = (
        select(
            PriceSnapshot.product_id,
            PriceSnapshot.price,
            func.row_number()
            .over(
                partition_by=PriceSnapshot.product_id,
                order_by=PriceSnapshot.scraped_at.desc(),
            )
            .label("rn"),
        )
        .subquery()
    )

    result = await db.execute(
        select(Alert, Product.title, Product.image_url, latest_price_subq.c.price)
        .join(Product, Alert.product_id == Product.id)
        .outerjoin(
            latest_price_subq,
            and_(
                Product.id == latest_price_subq.c.product_id,
                latest_price_subq.c.rn == 1,
            ),
        )
        .where(Alert.user_id == user.id)
        .order_by(Alert.created_at.desc())
    )
    rows = result.all()

    return [
        AlertResponse(
            id=alert.id,
            product_id=alert.product_id,
            product_title=title,
            product_image=image_url,
            current_price=price,
            target_price=alert.target_price,
            notify_via=alert.notify_via,
            is_active=alert.is_active,
            email=user.email,
            last_triggered=alert.last_triggered,
            created_at=alert.created_at,
        )
        for alert, title, image_url, price in rows
    ]


class EmailAlertUpdateRequest(BaseModel):
    email: str
    is_active: Optional[bool] = None
    target_price: Optional[int] = Field(None, gt=0)


@router.patch("/{alert_id}/by-email", response_model=AlertResponse)
async def update_alert_by_email(
    alert_id: UUID,
    body: EmailAlertUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update (pause/resume/retarget) an alert verified by email ownership."""
    from app.models.user import User

    user_result = await db.execute(select(User).where(User.email == body.email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email.")

    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == user.id))
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    if body.is_active is not None:
        alert.is_active = body.is_active
    if body.target_price is not None:
        alert.target_price = body.target_price

    await db.flush()

    return AlertResponse(
        id=alert.id,
        product_id=alert.product_id,
        target_price=alert.target_price,
        notify_via=alert.notify_via,
        is_active=alert.is_active,
        email=user.email,
        last_triggered=alert.last_triggered,
        created_at=alert.created_at,
    )


@router.delete("/{alert_id}/by-email", status_code=204)
async def delete_alert_by_email(
    alert_id: UUID,
    email: str = Query(..., description="Email address used when creating the alert"),
    db: AsyncSession = Depends(get_db),
):
    """Delete an alert verified by email ownership."""
    from app.models.user import User

    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email.")

    result = await db.execute(
        select(Alert).where(and_(Alert.id == alert_id, Alert.user_id == user.id))
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    await db.delete(alert)

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
from app.models.user import User


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
from app.limiter import limiter

@router.post("", response_model=AlertResponse, status_code=201)
@limiter.limit("5/minute")
async def create_alert(
    request: Request,
    body: CreateAlertRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a price drop alert for a product.
    Supports both authenticated users (via Bearer token) and anonymous users (via email).
    """
    
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

    # 2. Check free tier limit — advisory lock prevents race condition where
    # concurrent requests both pass the count check and create >3 alerts.
    if not target_user.is_premium:
        from sqlalchemy import text as _text
        await db.execute(
            _text("SELECT pg_advisory_xact_lock(('x' || left(md5(:uid), 15))::bit(60)::bigint)"),
            {"uid": str(target_user.id)},
        )
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
@limiter.limit("20/minute")
async def get_alerts_by_email(
    request: Request,
    email: str = Query(..., max_length=254, description="Email address used when creating the alert"),
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
@limiter.limit("10/minute")
async def update_alert_by_email(
    request: Request,
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
@limiter.limit("10/minute")
async def delete_alert_by_email(
    request: Request,
    alert_id: UUID,
    email: str = Query(..., max_length=254, description="Email address used when creating the alert"),
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


@router.get("/export.csv")
async def export_alerts_csv(
    email: str = Query(..., description="Email address to export alerts for"),
    db: AsyncSession = Depends(get_db),
):
    """Export all alerts for an email address as a CSV file."""
    import csv, io
    from fastapi.responses import StreamingResponse
    from app.models.user import User

    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email.")

    alerts_result = await db.execute(
        select(Alert, Product)
        .join(Product, Alert.product_id == Product.id)
        .where(Alert.user_id == user.id)
        .order_by(Alert.created_at.desc())
    )
    rows = alerts_result.all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["product_title", "platform", "product_url", "target_price_bdt", "is_active", "created_at", "last_triggered"])
    for alert, product in rows:
        writer.writerow([
            product.title,
            product.platform,
            product.url,
            round(alert.target_price / 100, 2),
            "yes" if alert.is_active else "no",
            alert.created_at.strftime("%Y-%m-%d %H:%M:%S") if alert.created_at else "",
            alert.last_triggered.strftime("%Y-%m-%d %H:%M:%S") if alert.last_triggered else "never",
        ])

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="damkoi_alerts.csv"'},
    )


# ── Telegram Account Linking ───────────────────────────────────────────────────


class TelegramLinkRequest(BaseModel):
    telegram_chat_id: str = Field(
        ...,
        description=(
            "The user's personal Telegram chat ID. "
            "Obtain by messaging @userinfobot or the DamKoi bot's /start command."
        ),
    )


@router.post("/telegram/link", status_code=200)
async def link_telegram(
    body: TelegramLinkRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Link the authenticated user's Telegram account for price-drop DMs.

    **How to get your chat_id:**
    1. Open Telegram and start a chat with the DamKoi bot.
    2. Send /start — the bot will reply with your personal chat ID.
    3. Paste that ID here.

    After linking, set `notify_via: ["email", "telegram"]` (or just `["telegram"]`)
    on any alert to receive personal DMs when the price drops.
    """
    from app.models.user import User as UserModel
    from app.services.telegram import get_telegram_service

    # Validate the chat_id is numeric
    chat_id_str = body.telegram_chat_id.strip()
    try:
        int(chat_id_str)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="telegram_chat_id must be a numeric string (e.g. '123456789').",
        )

    # Persist on user row
    result = await db.execute(
        select(UserModel).where(UserModel.id == user.id)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    db_user.telegram_chat_id = chat_id_str
    await db.commit()
    await db.refresh(db_user)

    # Fire-and-forget confirmation DM (errors don't fail the HTTP request)
    telegram = get_telegram_service()
    dm_sent = await telegram.send_telegram_link_confirmation(
        user_chat_id=chat_id_str,
        email=db_user.email or "",
    )

    return {
        "linked": True,
        "telegram_chat_id": chat_id_str,
        "confirmation_dm_sent": dm_sent,
        "message": (
            "Telegram linked successfully. "
            + ("A confirmation DM was sent to your Telegram." if dm_sent
               else "Could not send confirmation DM — check that you started the DamKoi bot first.")
        ),
    }


@router.delete("/telegram/unlink", status_code=200)
async def unlink_telegram(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove the Telegram link from the authenticated user's account.
    Future alerts will fall back to email-only delivery.
    """
    from app.models.user import User as UserModel

    result = await db.execute(
        select(UserModel).where(UserModel.id == user.id)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")

    db_user.telegram_chat_id = None
    await db.commit()

    return {"linked": False, "message": "Telegram unlinked. Alerts will be sent via email only."}


# ── Web Push ──────────────────────────────────────────────────


class PushSubscribeRequest(BaseModel):
    email: str
    subscription: dict  # raw PushSubscription.toJSON() from browser


@router.post("/push-subscribe", status_code=201)
@limiter.limit("5/minute")
async def push_subscribe(request: Request, body: PushSubscribeRequest, db: AsyncSession = Depends(get_db)):
    """
    Save a Web Push subscription for an email address.
    Called client-side after the browser grants push permission.
    Idempotent: upserts by (email, endpoint) to avoid duplicate rows.
    """
    import json
    from app.models.push_subscription import PushSubscription

    endpoint = body.subscription.get("endpoint", "")
    if not endpoint:
        raise HTTPException(status_code=422, detail="subscription.endpoint is required")

    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=422, detail="Valid email required")

    sub_json = json.dumps(body.subscription)

    # Check if subscription for this endpoint already exists
    from sqlalchemy import text
    existing = await db.execute(
        select(PushSubscription).where(
            PushSubscription.email == email,
            PushSubscription.subscription_json.contains(endpoint[:100]),
        )
    )
    row = existing.scalar_one_or_none()
    if row:
        row.is_active = True
        row.subscription_json = sub_json
    else:
        db.add(PushSubscription(email=email, subscription_json=sub_json))

    await db.commit()
    return {"subscribed": True}


@router.delete("/push-unsubscribe", status_code=200)
async def push_unsubscribe(email: str = Query(...), endpoint: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Mark a push subscription inactive (user revoked permission)."""
    import json
    from app.models.push_subscription import PushSubscription

    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.email == email.strip().lower(),
            PushSubscription.is_active == True,
        )
    )
    rows = result.scalars().all()
    for row in rows:
        try:
            sub = json.loads(row.subscription_json)
            if sub.get("endpoint") == endpoint:
                row.is_active = False
        except Exception:
            pass
    await db.commit()
    return {"unsubscribed": True}


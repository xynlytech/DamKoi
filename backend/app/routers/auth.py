"""
DamKoi — Auth Router
Handles user synchronization between Supabase and DamKoi database.
Also handles anonymous-to-user data migration.
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
import jwt

from app.database import get_db
from app.config import settings
from app.limiter import limiter
from app.models.user import User
from app.models.alert import Alert
from app.models.tracked_product import TrackedProduct

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/sync", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def sync_user(
    request: Request,
    token: str = Body(..., embed=True, max_length=4096),
    anon_id: Optional[str] = Body(None, embed=True, max_length=128),
    db: AsyncSession = Depends(get_db)
):
    """
    Synchronize user from Supabase to DamKoi.
    If anon_id is provided, migrate their anonymous alerts/tracking to the new user.
    """
    try:
        # 1. Verify token
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        supabase_id = payload.get("sub")
        email = payload.get("email")
        
        if not supabase_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing subject")

        # 2. Find or create user
        result = await db.execute(select(User).where(User.id == supabase_id))
        user = result.scalar_one_or_none()
        
        is_new_user = False
        if not user:
            is_new_user = True
            # Check if there's a shadow user with this email
            if email:
                result = await db.execute(select(User).where(User.email == email))
                shadow_user = result.scalar_one_or_none()
                if shadow_user:
                    # Upgrade shadow user to full user by changing ID
                    # Actually, SQLAlchemy doesn't like changing PKs easily.
                    # It's better to create a new user and migrate data if needed,
                    # or if the shadow user has the SAME email, we just delete shadow and create this.
                    # But for now, let's just create the new user with the supabase_id.
                    pass
            
            user = User(
                id=supabase_id,
                email=email,
                auth_provider="supabase"
            )
            db.add(user)
            await db.flush()

        # 3. Migrate data if anon_id is provided
        if anon_id:
            # Migrate alerts
            await db.execute(
                update(Alert)
                .where(and_(Alert.user_id == None, Alert.email == email)) # This logic might need adjustment
                .values(user_id=user.id)
            )
            # Migrate tracked products
            await db.execute(
                update(TrackedProduct)
                .where(TrackedProduct.anon_id == anon_id)
                .values(user_id=user.id, anon_id=None)
            )
            await db.flush()

        await db.commit()
        
        return {
            "status": "synced",
            "user_id": user.id,
            "email": user.email,
            "is_new": is_new_user
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")

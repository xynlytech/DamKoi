"""
DamKoi — Auth Middleware
Local JWT verification for Supabase tokens.
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models.user import User

security = HTTPBearer()

async def get_current_user(
    res: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Validate Supabase JWT and return the User object.
    Meeting the sub-10ms target via local verification.
    """
    token = res.credentials
    
    try:
        # 1. Decode and validate JWT locally
        # Supabase uses HS256 with the JWT Secret
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )
            
        # 2. Find user in our database
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            # This shouldn't happen if they just synced, but handle it
            # We'll return 401 and let the frontend trigger a sync
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not synced with DamKoi database",
            )
            
        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auth error: {str(e)}",
        )

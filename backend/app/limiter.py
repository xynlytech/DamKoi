from fastapi import Request
from slowapi import Limiter


def get_client_ip(request: Request) -> str:
    # Vercel (and most proxies) set X-Forwarded-For: <client>, <proxy1>, ...
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_client_ip)

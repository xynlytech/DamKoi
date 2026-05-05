"""
DamKoi — Mailer Service

Handles transaction email delivery via Resend.
Free tier: 100 emails / day.
"""

import resend
from app.config import settings

# Initialize Resend
if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY


class Mailer:
    """Service to send emails using Resend SDK."""

    @staticmethod
    def send_price_drop_email(
        to_email: str,
        product_title: str,
        product_url: str,
        current_price: float,
        target_price: float,
        image_url: str = None
    ) -> bool:
        """
        Send a price drop notification email.
        """
        if not settings.RESEND_API_KEY:
            print("[WARN] RESEND_API_KEY not configured. Skipping email.")
            return False

        try:
            params = {
                "from": settings.EMAIL_FROM,
                "to": [to_email],
                "subject": f"[Price Drop] {product_title[:40]} reached your target price",
                "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
                    <div style="background: #a78bfa; padding: 2px; border-radius: 12px; margin-bottom: 20px;">
                        <div style="background: white; padding: 30px; border-radius: 10px;">
                            <h1 style="color: #111; font-size: 24px; margin-bottom: 10px;">Price Alert Triggered</h1>
                            <p style="font-size: 16px; color: #4b5563; margin-bottom: 25px;">
                                A product you are tracking just hit your target price on Daraz.
                            </p>
                            
                            <div style="padding: 20px; background: #f9fafb; border-radius: 8px; margin-bottom: 25px;">
                                <h2 style="font-size: 18px; margin-top: 0;">{product_title}</h2>
                                <div style="display: flex; gap: 20px; align-items: center; margin-top: 15px;">
                                    <div>
                                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Current Price</p>
                                        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #10b981;">৳{current_price:,.0f}</p>
                                    </div>
                                    <div style="margin-left: 30px;">
                                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Target</p>
                                        <p style="margin: 0; font-size: 18px; color: #374151;">৳{target_price:,.0f}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <a href="{product_url}" style="display: inline-block; background: #a78bfa; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                                View Deal on Daraz →
                            </a>
                            
                            <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
                                — DamKoi | Bangladesh Shopping Intelligence<br/>
                                You received this because you set a price alert for this item.
                            </p>
                        </div>
                    </div>
                </div>
                """
            }

            resend.Emails.send(params)
            return True
        except Exception as e:
            print(f"[ERROR] Resend error: {e}")
            return False


# Singleton instance
mailer = Mailer()

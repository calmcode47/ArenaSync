import os
import base64
import logging
import firebase_admin
from firebase_admin import credentials, auth, firestore, messaging
from app.core.config import settings
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class FirebaseClient:
    def __init__(self) -> None:
        self.firebase_app = None
        
        if not getattr(settings, "FIREBASE_PROJECT_ID", None):
            logger.warning("Firebase not configured — FCM push notifications disabled")
            return
            
        # Guard against double initialization
        if firebase_admin._apps:
            self.firebase_app = firebase_admin.get_app()
            return
            
        cred_path = None
        
        # 1. Local Dev Path
        if os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred_path = settings.FIREBASE_CREDENTIALS_PATH
            
        # 2. Base64 Env Var (Production / Railway)
        elif "FIREBASE_CREDENTIALS_BASE64" in os.environ:
            try:
                b64_str = os.environ["FIREBASE_CREDENTIALS_BASE64"]
                json_data = base64.b64decode(b64_str)
                with open("/tmp/firebase_credentials.json", "wb") as f:
                    f.write(json_data)
                cred_path = "/tmp/firebase_credentials.json"
                logger.info("Decoded Firebase credentials from Base64 env var.")
            except Exception as e:
                logger.warning(f"Failed to decode Firebase base64 credentials: {e}")
                
        # 3. Initialize SDK
        if cred_path:
            try:
                cred = credentials.Certificate(cred_path)
                self.firebase_app = firebase_admin.initialize_app(cred, {
                    'projectId': settings.FIREBASE_PROJECT_ID,
                })
                logger.info("Firebase Admin SDK successfully initialized.")
            except Exception as e:
                logger.warning(f"Firebase initialization error from path {cred_path}: {e}")
        else:
            logger.warning("No Firebase credentials provided. FCM messaging functions are disabled (No-Ops).")

    @property
    def auth_client(self) -> Any:
        return auth if self.firebase_app else None

    @property
    def firestore_client(self) -> Any:
        return firestore.client() if self.firebase_app else None

    @property
    def messaging_client(self) -> Any:
        return messaging if self.firebase_app else None

    async def verify_id_token(self, id_token: str) -> Dict[str, Any]:
        """Verify Firebase auth token asynchronously"""
        if not self.auth_client:
            logger.warning("FCM auth verification skipped: No Firebase environment.")
            return {}
        try:
            return self.auth_client.verify_id_token(id_token)
        except Exception as e:
            logger.error(f"FCM auth error: {e}")
            return {}

    async def send_fcm_notification(self, token: str, title: str, body: str, data: Optional[Dict[str, str]] = None) -> str:
        """Send FCM notification"""
        if not self.messaging_client:
            logger.warning(f"FCM notification skipped (No Firebase config): {title}")
            return "skipped"
            
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                token=token,
            )
            response = self.messaging_client.send(message)
            return response
        except Exception as e:
            logger.error(f"Failed to send FCM: {e}")
            return "error"

firebase_client = FirebaseClient()

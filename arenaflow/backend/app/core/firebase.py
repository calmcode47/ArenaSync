import os
import base64
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import firebase_admin
from firebase_admin import credentials, auth, messaging, firestore
from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level executor for sync Firebase Admin SDK calls
executor = ThreadPoolExecutor(max_workers=4)

def _initialize_firebase() -> Optional[firebase_admin.App]:
    """Initialize Firebase Admin SDK with base64 or path-based credentials."""
    # Double-init guard
    if firebase_admin._apps:
        return firebase_admin.get_app()

    project_id = getattr(settings, "FIREBASE_PROJECT_ID", None)
    if not project_id:
        logger.warning("FIREBASE_PROJECT_ID not set. Firebase functions will be no-ops.")
        return None

    cred_path = None
    
    # 1. Check for Base64 credentials (Cloud Run / Production)
    b64_creds = os.environ.get("FIREBASE_CREDENTIALS_BASE64")
    if b64_creds:
        try:
            cred_content = base64.b64decode(b64_creds)
            temp_path = "/tmp/firebase_credentials.json"
            with open(temp_path, "wb") as f:
                f.write(cred_content)
            cred_path = temp_path
            logger.info("Firebase: Using credentials decoded from FIREBASE_CREDENTIALS_BASE64.")
        except Exception as e:
            logger.error(f"Firebase: Failed to decode base64 credentials: {e}")

    # 2. Check for local path (Development)
    if not cred_path and getattr(settings, "FIREBASE_CREDENTIALS_PATH", None):
        if os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred_path = settings.FIREBASE_CREDENTIALS_PATH
            logger.info(f"Firebase: Using credentials from file path: {cred_path}")

    # 3. Initialize App
    if cred_path:
        try:
            cred = credentials.Certificate(cred_path)
            app = firebase_admin.initialize_app(cred, {
                'projectId': project_id,
            })
            logger.info("Firebase Admin SDK successfully initialized.")
            return app
        except Exception as e:
            logger.error(f"Firebase: Initialization failed: {e}")
    else:
        logger.warning("Firebase: No credentials provided. SDK functionality disabled.")
    
    return None

# Global Firebase app instance
firebase_app = _initialize_firebase()


class FirebaseClient:
    async def verify_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        return await verify_firebase_token(id_token)


firebase_client = FirebaseClient()

async def verify_firebase_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Firebase ID token.
    Returns decoded token dictionary on success, None otherwise.
    """
    if not firebase_app:
        return None

    try:
        loop = asyncio.get_event_loop()
        # verify_id_token is a sync call
        decoded_token = await loop.run_in_executor(
            executor, 
            lambda: auth.verify_id_token(id_token, check_revoked=True)
        )
        return decoded_token
    except Exception as e:
        logger.debug(f"Firebase: Token verification failed: {e}")
        return None

async def send_fcm_notification(
    fcm_token: str, 
    title: str, 
    body: str, 
    data: Optional[Dict[str, str]] = None
) -> bool:
    """
    Send push notification via FCM.
    Returns True on success, False on failure.
    """
    if not firebase_app:
        return False

    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=fcm_token,
        )
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            executor,
            lambda: messaging.send(message)
        )
        return True
    except messaging.UnregisteredError:
        logger.debug(f"FCM: Token expired/unregistered: {fcm_token[:20]}...")
        return False
    except messaging.SenderIdMismatchError:
        logger.error("FCM: Sender ID mismatch error.")
        return False
    except Exception as e:
        logger.warning(f"FCM: Failed to send notification: {e}")
        return False

async def register_fcm_token(user_id: str, fcm_token: str) -> None:
    """
    Store FCM token in Firestore for real-time fan-out.
    """
    if not firebase_app:
        return

    try:
        db = firestore.client()
        doc_ref = db.collection("fcm_tokens").document(user_id)
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            executor,
            lambda: doc_ref.set({
                "token": fcm_token,
                "user_id": user_id,
                "updated_at": datetime.now(timezone.utc)
            })
        )
        logger.info(f"FCM: Registered token for user {user_id}")
    except Exception as e:
        logger.error(f"FCM: Failed to register token in Firestore: {e}")

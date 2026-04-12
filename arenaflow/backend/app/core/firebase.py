import firebase_admin
from firebase_admin import credentials, auth, firestore, messaging
from app.core.config import settings
from typing import Optional, Dict, Any

_app_instance: Optional[firebase_admin.App] = None

class FirebaseClient:
    def __init__(self) -> None:
        global _app_instance
        if not _app_instance:
            try:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                _app_instance = firebase_admin.initialize_app(cred, {
                    'projectId': settings.FIREBASE_PROJECT_ID,
                })
            except Exception as e:
                print(f"Firebase initialization error: {e}")
                
        self.firebase_app = _app_instance

    @property
    def auth_client(self) -> Any:
        return auth

    @property
    def firestore_client(self) -> Any:
        return firestore.client()

    @property
    def messaging_client(self) -> Any:
        return messaging

    async def verify_id_token(self, id_token: str) -> Dict[str, Any]:
        """Verify Firebase auth token asynchronously"""
        return self.auth_client.verify_id_token(id_token)

    async def send_fcm_notification(self, token: str, title: str, body: str, data: Optional[Dict[str, str]] = None) -> str:
        """Send FCM notification"""
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

firebase_client = FirebaseClient()

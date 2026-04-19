import asyncio
import logging
import uuid
from contextlib import asynccontextmanager

import bcrypt

# Monkeypatch bcrypt for passlib compatibility in newer Python/bcrypt versions
if not hasattr(bcrypt, "__about__"):
    class About:
        __version__ = bcrypt.__version__
    bcrypt.__about__ = About()

from app.core.logger import setup_logging

setup_logging()

logger = logging.getLogger(__name__)

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.dependencies import limiter
from app.db.init_db import init_db
from app.db.session import engine
from app.services.ml.prophet_engine import prophet_engine


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Relax CSP for development and required external services
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "connect-src 'self' http://localhost:8000 ws://localhost:8000 https://*.googleapis.com https://*.firebaseio.com; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https://*.googleapis.com https://*.google.com; "
            "frame-src 'self' https://*.google.com"
        )
        response.headers["X-Request-ID"] = req_id
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    await init_db()

    # Init Firebase singleton
    from app.core.firebase import firebase_client
    _ = firebase_client

    # Prophet warmup — run in background, do not block startup
    async def _warmup():
        try:
            from app.db.session import AsyncSessionLocal
            async with AsyncSessionLocal() as db:
                demo_venue_id = settings.DEMO_VENUE_ID  # Optional env var
                if demo_venue_id:
                    result = await prophet_engine.warmup_all_zones(db, demo_venue_id)
                    logger.info(f"Prophet warmup complete: {result}")
        except Exception as e:
            logger.warning(f"Prophet warmup failed (non-critical): {e}")

    asyncio.create_task(_warmup())

    yield

    # Shutdown actions
    await engine.dispose()

app = FastAPI(
    title="ArenaFlow API",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
# Ideally allow_hosts should come from environment config
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded"}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Convert body to string if it's not JSON serializable (like FormData)
    body = exc.body
    if not isinstance(body, (str, dict, list, int, float, bool, type(None))):
        body = str(body)

    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Validation error: {exc.errors()}\nBody: {body}")

    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": body}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Global error caught: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Placeholders for future routers
# from app.api.v1 import routes as v1_routes
from app.api.v1.routes import alerts, auth, crowd, food, health, maps, ml, queue, virtual_queue
from app.websocket import handlers as websocket_handlers

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(maps.router, prefix="/api/v1/maps", tags=["Maps"])
app.include_router(crowd.router, prefix="/api/v1/crowd", tags=["Crowd"])
app.include_router(queue.router, prefix="/api/v1/queue", tags=["Queue"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(virtual_queue.router, prefix="/api/v1/vqueue", tags=["Virtual Queue"])
app.include_router(ml.router, prefix="/api/v1/ml", tags=["Machine Learning"])
app.include_router(food.router, prefix="/api/v1/food", tags=["Food & Beverage"])
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(websocket_handlers.router, prefix="/ws", tags=["WebSocket"])

from contextlib import asynccontextmanager
from typing import Dict
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.dependencies import limiter
from app.db.init_db import init_db
from app.db.session import engine

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["X-Request-ID"] = req_id
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    await init_db()
    
    # Init Firebase singleton
    from app.core.firebase import firebase_client
    _ = firebase_client
    
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
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Placeholders for future routers
# from app.api.v1 import routes as v1_routes
from app.api.v1.routes import virtual_queue
# from app.websocket import manager as ws_manager
# app.include_router(v1_routes.router, prefix="/api/v1")
app.include_router(virtual_queue.router, prefix="/api/v1/vqueue", tags=["Virtual Queue"])
# app.include_router(ws_manager.router, prefix="/ws")

@app.get("/health", tags=["health"])
async def health_check() -> Dict[str, str]:
    return {"status": "ok", "env": settings.APP_ENV}

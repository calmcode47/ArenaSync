from fastapi import APIRouter, Depends, Request
from app.schemas.food import FoodItemOut, OrderCreate, OrderOut
from app.services.food_service import food_service
from app.core.dependencies import limiter

router = APIRouter()

@router.get("/items", response_model=list[FoodItemOut])
@limiter.limit("60/minute")
async def get_food_items(request: Request):
    """Retrieve all available food items."""
    return await food_service.get_items()

@router.post("/order", response_model=OrderOut)
@limiter.limit("10/minute")
async def place_order(request: Request, data: OrderCreate):
    """Place a new food order."""
    return await food_service.place_order(data)

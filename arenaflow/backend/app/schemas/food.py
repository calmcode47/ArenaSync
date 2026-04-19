from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class FoodItemOut(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    image_url: str
    is_available: bool = True


class OrderItemCreate(BaseModel):
    item_id: str
    quantity: int


class OrderCreate(BaseModel):
    venue_id: UUID
    items: List[OrderItemCreate]
    total_amount: float
    seat_identifier: Optional[str] = None


class OrderOut(BaseModel):
    id: str
    status: str
    total_amount: float
    estimated_delivery: datetime
    order_number: str

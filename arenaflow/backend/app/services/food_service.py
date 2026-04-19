import random
import string
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.schemas.food import FoodItemOut, OrderCreate, OrderOut


class FoodService:
    def __init__(self):
        self._items = [
            # Premium Grill
            FoodItemOut(
                id="food_1",
                name="Signature Wagyu Burger",
                description="Double wagyu patty, truffle aioli, aged cheddar, on brioche.",
                price=18.50,
                category="Premium Grill",
                image_url="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800",
            ),
            FoodItemOut(
                id="food_2",
                name="Colossal Stadium Hot Dog",
                description="All-beef quarter pounder with caramelized onions and spicy brown mustard.",
                price=12.00,
                category="Premium Grill",
                image_url="https://images.unsplash.com/photo-1612392062631-94dd858cba88?auto=format&fit=crop&q=80&w=800",
            ),
            # Snacks & Sides
            FoodItemOut(
                id="food_3",
                name="Truffle Parmesan Fries",
                description="Hand-cut potatoes, white truffle oil, rosemary, and aged parmesan.",
                price=9.50,
                category="Snacks & Sides",
                image_url="https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800",
            ),
            FoodItemOut(
                id="food_4",
                name="Grand Slam Nachos",
                description="House-made chips, queso blanco, pickled jalapeños, and fresh pico de gallo.",
                price=14.00,
                category="Snacks & Sides",
                image_url="https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&q=80&w=800",
            ),
            # Refreshments
            FoodItemOut(
                id="food_5",
                name="Craft IPA - Local Brew",
                description="Crisp, hoppy local IPA served in a chilled 16oz cup.",
                price=11.00,
                category="Refreshments",
                image_url="https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&q=80&w=800",
            ),
            FoodItemOut(
                id="food_6",
                name="Artisanal Berry Lemonade",
                description="Freshly squeezed lemons with a blend of seasonal forest berries.",
                price=7.50,
                category="Refreshments",
                image_url="https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&q=80&w=800",
            ),
        ]

    async def get_items(self) -> list[FoodItemOut]:
        return self._items

    async def place_order(self, data: OrderCreate) -> OrderOut:
        # Simulate processing time
        order_num = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return OrderOut(
            id=str(random.randint(100000, 999999)),
            status="confirmed",
            total_amount=data.total_amount,
            estimated_delivery=datetime.now(timezone.utc) + timedelta(minutes=15),
            order_number=f"AF-{order_num}",
        )


food_service = FoodService()

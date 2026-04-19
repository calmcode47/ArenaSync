import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  category: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getServiceFee: () => number;
  getTotal: () => number;
}

const TAX_RATE = 0.08;
const SERVICE_FEE = 2.50;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (newItem) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(i => i.id === newItem.id);
        
        if (existingItem) {
          set({
            items: currentItems.map(i => 
              i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
            )
          });
        } else {
          set({ items: [...currentItems, { ...newItem, quantity: 1 }] });
        }
      },
      
      removeItem: (id) => set({
        items: get().items.filter(i => i.id !== id)
      }),
      
      updateQuantity: (id, delta) => {
        const currentItems = get().items;
        set({
          items: currentItems.map(i => {
            if (i.id === id) {
              const newQty = Math.max(0, i.quantity + delta);
              return { ...i, quantity: newQty };
            }
            return i;
          }).filter(i => i.quantity > 0)
        });
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
      
      getSubtotal: () => get().items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
      
      getTax: () => get().getSubtotal() * TAX_RATE,
      
      getServiceFee: () => get().items.length > 0 ? SERVICE_FEE : 0,
      
      getTotal: () => get().getSubtotal() + get().getTax() + get().getServiceFee(),
    }),
    {
      name: 'arenaflow-cart',
    }
  )
);

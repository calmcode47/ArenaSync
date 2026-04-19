import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  UtensilsCrossed,
  Beer,
  Pizza,
  CreditCard,
  X
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

const FoodService: React.FC = () => {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderComplete, setOrderComplete] = useState<any>(null);

  const { 
    items: cartItems, 
    addItem, 
    updateQuantity, 
    clearCart,
    getSubtotal,
    getTax,
    getServiceFee,
    getTotal,
    getTotalItems
  } = useCartStore();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await apiClient.get('/food/items');
        setItems(response.data);
      } catch (err) {
        console.error("Failed to fetch food items:", err);
      }
    };
    fetchItems();
  }, []);

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];
  const filteredItems = selectedCategory === 'All' 
    ? items 
    : items.filter(i => i.category === selectedCategory);

  const handlePlaceOrder = async () => {
    setIsOrdering(true);
    try {
        const venueId = localStorage.getItem('arenaflow_venue_id') || "00000000-0000-0000-0000-000000000000";
        const response = await apiClient.post('/food/order', {
            venue_id: venueId,
            items: cartItems.map(i => ({ item_id: i.id, quantity: i.quantity })),
            total_amount: getTotal(),
            seat_identifier: "Section 108, Row 12, Seat 4"
        });
        setOrderComplete(response.data);
        clearCart();
        toast.success("Order Placed Successfully!");
    } catch (err) {
        toast.error("Failed to place order. Please try again.");
    } finally {
        setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent"
          >
            Stadium Dining
          </motion.h1>
          <p className="text-gray-400 mt-2">Premium cuisine delivered to your seat.</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCartOpen(true)}
          className="relative p-4 bg-gray-900 rounded-2xl border border-gray-800"
        >
          <ShoppingBag className="w-6 h-6 text-blue-400" />
          {getTotalItems() > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#050505]">
              {getTotalItems()}
            </span>
          )}
        </motion.button>
      </div>

      {/* Categories */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-2 rounded-full whitespace-nowrap transition-all duration-300 border ${
              selectedCategory === cat 
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -5 }}
              className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-3xl overflow-hidden group"
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold border border-white/10">
                  ${item.price.toFixed(2)}
                </div>
              </div>
              
              <div className="p-5">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">{item.category}</div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-300 transition-colors">{item.name}</h3>
                <p className="text-sm text-gray-400 line-clamp-2 mb-6">{item.description}</p>
                
                <button
                  onClick={() => {
                    addItem({ ...item, image: item.image_url });
                    toast.success(`Added ${item.name} to cart`);
                  }}
                  className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-400 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add to Order
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" 
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0a0a0a] border-l border-gray-800 z-[60] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-bold">Your Order</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <UtensilsCrossed className="w-16 h-16 mb-4" />
                    <p className="text-lg">Your cart is empty</p>
                    <p className="text-sm">Add some delicious items from the menu!</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.image} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <h4 className="font-bold">{item.name}</h4>
                          <span className="font-bold text-blue-400">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-800">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 hover:text-white text-gray-500"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="mx-3 text-sm font-bold min-w-[20px] text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 hover:text-white text-gray-500"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="p-6 bg-gray-900/50 border-t border-gray-800 space-y-4">
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-white">${getSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sales Tax (8%)</span>
                      <span className="text-white">${getTax().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Fee</span>
                      <span className="text-white">${getServiceFee().toFixed(2)}</span>
                    </div>
                    <div className="pt-4 flex justify-between text-xl font-bold text-white border-t border-gray-800">
                      <span>Total</span>
                      <span className="text-emerald-400">${getTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                    disabled={isOrdering}
                    onClick={handlePlaceOrder}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                  >
                    {isOrdering ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" /> Place Order
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Order Success Modal */}
      <AnimatePresence>
        {orderComplete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[100] p-6 bg-black/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-gray-900 border border-gray-800 p-8 rounded-[40px] max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-white">Order Confirmed!</h2>
              <p className="text-gray-400 mb-8">Your food is being prepared. Est. delivery in 15 mins.</p>
              
              <div className="bg-black/40 rounded-3xl p-6 mb-8 border border-white/5">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Order Number</div>
                <div className="text-2xl font-mono font-bold text-blue-400">{orderComplete.order_number}</div>
              </div>
              
              <button
                onClick={() => setOrderComplete(null)}
                className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Back to Menu
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FoodService;

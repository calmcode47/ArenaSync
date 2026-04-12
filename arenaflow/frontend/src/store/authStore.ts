import { create } from 'zustand';

interface User {
    id: string;
    name: string;
    role: 'user' | 'staff' | 'admin';
}

interface AuthState {
    user: User | null;
    setUser: (user: User | null) => void;
    login: (role?: 'user' | 'staff' | 'admin') => void;
    logout: () => void;
}

// Global Auth Store using Zustand
export const useAuthStore = create<AuthState>((set) => ({
    // For the hackathon demo, we default to an admin/staff user so the Alerts Center broadcast works
    user: {
        id: 'admin-123',
        name: 'ArenaFlow Command',
        role: 'admin',
    },
    
    // Set user manually
    setUser: (user) => set({ user }),
    
    // Mock login action
    login: (role = 'admin') => set({ 
        user: { id: `mock-${role}-456`, name: `Mock ${role.toUpperCase()}`, role } 
    }),
    
    // Mock logout action
    logout: () => set({ user: null }),
}));

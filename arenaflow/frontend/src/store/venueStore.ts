import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Venue } from '../types';

interface VenueState {
    venueId: string | null;
    venue: Venue | null;
    currentUser: any | null;
    setVenueId: (id: string | null) => void;
    setVenue: (venue: Venue | null) => void;
    setCurrentUser: (user: any | null) => void;
    clearVenue: () => void;
}

export const useVenueStore = create<VenueState>()(
    persist(
        (set) => ({
            venueId: null,
            venue: null,
            currentUser: null,
            setVenueId: (id) => set({ venueId: id }),
            setVenue: (venue) => set({ venue: venue }),
            setCurrentUser: (user) => set({ currentUser: user }),
            clearVenue: () => set({ venueId: null, venue: null, currentUser: null }),
        }),
        {
            name: "arenaflow-venue",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ venueId: state.venueId }),
        }
    )
);

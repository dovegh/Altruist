/**
 * Saved products.
 *
 * The heart on Product Detail and the catalogue cards. It was `useState`, so it
 * cleared the moment you navigated away — a control that visibly toggles and
 * then forgets is worse than no control.
 *
 * Ids only, for the same reason the cart stores ids: a saved product should be
 * priced and described by today's catalogue, not by whatever it looked like
 * when it was saved.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type State = {
  ids: string[];
  toggle: (id: string) => void;
  isSaved: (id: string) => boolean;
};

export const useSavedStore = create<State>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
        })),
      isSaved: (id) => get().ids.includes(id),
    }),
    {
      name: 'altruist.saved-products',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Whether one product is saved. Subscribes to that id only. */
export function useIsSaved(id: string | undefined): boolean {
  return useSavedStore((s) => (id ? s.ids.includes(id) : false));
}

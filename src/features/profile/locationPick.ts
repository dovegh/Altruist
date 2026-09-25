/**
 * Hand-off between Add Address and the map picker.
 *
 * The picker is its own screen, and a route param cannot carry a result back.
 * Add Address sets `initial` before opening it; the picker leaves `picked` and
 * goes back; Add Address takes it (which clears it) when it regains focus.
 */
import { create } from 'zustand';
import type { LatLng } from '@/lib/api';

export type PickedLocation = { pin: LatLng; line: string };

type State = {
  initial: LatLng | null;
  picked: PickedLocation | null;
};

export const useLocationPick = create<State>(() => ({ initial: null, picked: null }));

export function openPickerAt(initial: LatLng | null): void {
  useLocationPick.setState({ initial, picked: null });
}

export function takePickedLocation(): PickedLocation | null {
  const { picked } = useLocationPick.getState();
  if (picked) useLocationPick.setState({ picked: null });
  return picked;
}

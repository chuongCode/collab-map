import { create } from "zustand";
import type { Pin, Route } from "../types";

type PinsState = {
  pins: Pin[];
  selectedId?: string | null;
  route?: Route | null;
  addPin: (pin: Omit<Pin, "id"> & { id?: string }) => Pin;
  updatePin: (id: string, patch: Partial<Pin>) => void;
  deletePin: (id: string) => void;
  selectPin: (id?: string | null) => void;
  clearPins: () => void;
  setRoute: (route: Route | null) => void;
  clearRoute: () => void;
};

const usePins = create<PinsState>((set: any, get: any) => ({
  pins: [],
  selectedId: null,
  route: null,
  addPin: (pin) => {
    const id = pin.id ?? crypto.randomUUID();
    const newPin: Pin = {
      id,
      title: pin.title,
      coordinates: pin.coordinates,
      color: (pin as any).color,
    };
    set((s: any) => ({ pins: [...s.pins, newPin] }));
    // debug log removed
    return newPin;
  },
  updatePin: (id, patch) =>
    set((s: any) => ({
      pins: s.pins.map((p: any) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  deletePin: (id) => {
    set((s: any) => ({ pins: s.pins.filter((p: any) => p.id !== id) }));
    // If the route references this pin remove the route
    const r = get().route as Route | null | undefined;
    if (r && r.properties) {
      const { fromId, toId } = r.properties as any;
      if (fromId === id || toId === id) {
        set({ route: null });
      }
    }
  },
  selectPin: (id) => set(() => ({ selectedId: id ?? null })),
  clearPins: () => set({ pins: [], selectedId: null, route: null }),
  setRoute: (route) => set({ route }),
  clearRoute: () => set({ route: null }),
}));

export default usePins;

export const usePinsActions = () => {
  const add = usePins((s) => s.addPin);
  const update = usePins((s) => s.updatePin);
  const del = usePins((s) => s.deletePin);
  const select = usePins((s) => s.selectPin);
  const clear = usePins((s) => s.clearPins);
  const setRoute = usePins((s) => s.setRoute);
  const clearRoute = usePins((s) => s.clearRoute);

  return { add, update, del, select, clear, setRoute, clearRoute };
};

export const usePinsState = () => {
  const pins = usePins((s) => s.pins);
  const selectedId = usePins((s) => s.selectedId);
  const route = usePins((s) => s.route);
  return { pins, selectedId, route };
};

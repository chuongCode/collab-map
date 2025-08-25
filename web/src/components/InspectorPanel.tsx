import { useEffect, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { usePinsActions, usePinsState } from "../hooks/usePins";

export default function InspectorPanel({ map }: { map?: MapboxMap | null }) {
  const { add, clear, clearRoute } = usePinsActions();
  const { pins } = usePinsState();
  const [isOpen, setIsOpen] = useState(true);
  const [isPlacing, setIsPlacing] = useState(false);

  // When in placing mode, attach a one-time click handler to the map to place the pin
  useEffect(() => {
    if (!isPlacing || !map) return;

    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    canvas.style.cursor = "crosshair";

    const onMapClick = (e: any) => {
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      const color = (window as any).__CLIENT_COLOR as string | undefined;
      const created = add({ title: "Pin", coordinates: [lng, lat], color });
      if (map && created) map.easeTo({ center: created.coordinates, duration: 400 });
      setIsPlacing(false);
    };

    // triggers a single placement
    map.once("click", onMapClick);

    // cleanup: restore cursor and ensure listener removed
    return () => {
      try {
        canvas.style.cursor = prevCursor || "";
      } catch (e) {}
      try {
        map.off("click", onMapClick as any);
      } catch (e) {}
    };
  }, [isPlacing, map, add]);

  const togglePinPlacement = () => setIsPlacing((s) => !s);

  const requestRouteForLastTwo = () => {
    if (pins.length >= 2) {
      const lastTwo = pins.slice(-2);
      const from = lastTwo[0].coordinates;
      const to = lastTwo[1].coordinates;
      const fromId = lastTwo[0].id;
      const toId = lastTwo[1].id;
      window.dispatchEvent(
        new CustomEvent("request-route", { detail: { from, to, fromId, toId } })
      );
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed right-4 top-1/3 z-50">
        <button
          className="btn btn-sm text-white bg-[#3a3a3a] border-gray-600"
          onClick={() => setIsOpen(true)}
          aria-label="Open inspector"
        >
          Inspect
        </button>
      </div>
    );
  }

  return (
    <aside
      className="fixed right-0 top-0 h-full z-50 w-80 bg-[#2c2c2c] text-white shadow-lg border-l border-gray-700"
      aria-label="Inspector panel"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-medium text-gray-100">Inspector</h3>
        <div className="space-x-2">
          <button
            className="btn btn-ghost btn-sm text-white"
            onClick={() => setIsOpen(false)}
            aria-label="Close inspector"
          >
            Close
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-auto text-gray-200" style={{ maxHeight: 'calc(100vh - 64px)' }}>
        <section>
          <div className="font-semibold mb-2 text-gray-100">Pins</div>
          <div className="flex flex-col gap-2">
            <button
              className={`btn ${isPlacing ? 'btn-success' : 'btn-outline'} text-white`}
              onClick={togglePinPlacement}
            >
              {isPlacing ? 'Placing: Click map' : 'Add Pin'}
            </button>

            <button className="btn btn-accent text-white" onClick={requestRouteForLastTwo}>
              Route (last 2)
            </button>

            <button className="btn btn-warning text-white" onClick={() => clear()}>
              Clear Pins
            </button>

            <button className="btn btn-outline text-white" onClick={() => clearRoute()}>
              Clear Route
            </button>
          </div>
        </section>

        <section>
          <div className="font-semibold mb-2 text-gray-100">Selection</div>
          <div className="text-sm text-gray-300">{pins.length} pins on board</div>
        </section>

        <section>
          <div className="font-semibold mb-2 text-gray-100">Shortcuts</div>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm text-white">Reset View</button>
            <button className="btn btn-ghost btn-sm text-white">Center</button>
          </div>
        </section>
      </div>
    </aside>
  );
}

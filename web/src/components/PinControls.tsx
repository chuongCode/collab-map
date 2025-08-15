import { usePinsActions, usePinsState } from "../hooks/usePins";
import type * as mapboxgl from "mapbox-gl";

export default function PinControls({ map }: { map?: mapboxgl.Map | null }) {
  const { add, clear, clearRoute } = usePinsActions();
  const { pins } = usePinsState();

  const addAtCenter = () => {
  // If map isn't ready yet, fall back to a sensible default center
  const fallback: [number, number] = [-77.63, 43.13];
  const center = map ? map.getCenter() : { lng: fallback[0], lat: fallback[1] };
  const created = add({ title: "Pin", coordinates: [center.lng, center.lat] });
  if (map && created) {
    map.easeTo({ center: created.coordinates, duration: 400 });
  }
  };

  return (
    <div style={{ position: "absolute", left: 12, top: 12, zIndex: 1001, pointerEvents: "auto" }}>
      <div style={{ display: "flex", gap: 8 }}>
  <button onClick={addAtCenter}>Add Pin</button>
        <button
          onClick={() => {
            // create route between the last two pins placed
            if (pins.length >= 2) {
              const lastTwo = pins.slice(-2);
              const from = lastTwo[0].coordinates;
              const to = lastTwo[1].coordinates;
              const fromId = lastTwo[0].id;
              const toId = lastTwo[1].id;
              window.dispatchEvent(new CustomEvent("request-route", { detail: { from, to, fromId, toId } }));
            }
          }}
        >
          Route (last 2)
        </button>
        <button onClick={() => clear()}>Clear Pins</button>
        <button onClick={() => clearRoute()}>Clear Route</button>
      </div>
    </div>
  );
}

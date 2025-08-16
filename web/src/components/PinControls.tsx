import { usePinsActions, usePinsState } from "../hooks/usePins";
import { useEffect, useState } from "react";
import type * as mapboxgl from "mapbox-gl";
import "../styles/pin-controls.css";

export default function PinControls({ map }: { map?: mapboxgl.Map | null }) {
  const { add, clear, clearRoute } = usePinsActions();
  const { pins } = usePinsState();

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
      const created = add({ title: "Pin", coordinates: [lng, lat] });
      if (map && created)
        map.easeTo({ center: created.coordinates, duration: 400 });
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

  const togglePinPlacement = () => {
    setIsPlacing((s) => !s);
  };

  return (
    <div className="pin-controls-container">
      <div className="pin-controls-buttons">
        <button onClick={togglePinPlacement}>Add Pin</button>
        <button
          onClick={() => {
            // create route between the last two pins placed
            if (pins.length >= 2) {
              const lastTwo = pins.slice(-2);
              const from = lastTwo[0].coordinates;
              const to = lastTwo[1].coordinates;
              const fromId = lastTwo[0].id;
              const toId = lastTwo[1].id;
              window.dispatchEvent(
                new CustomEvent("request-route", {
                  detail: { from, to, fromId, toId },
                })
              );
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

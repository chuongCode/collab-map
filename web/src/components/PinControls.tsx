import { usePinsActions, usePinsState } from "../hooks/usePins";
import { useEffect, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

export default function PinControls({ map }: { map?: MapboxMap | null }) {
  const { add, clear, clearRoute } = usePinsActions();
  const { pins } = usePinsState();

  const [isPlacing, setIsPlacing] = useState(false);

  // When in placing mode, attach a one-time click handler to the map to place the pin
  useEffect(() => {
    if (!isPlacing || !map) return;

    // change cursor to crosshair
    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    canvas.style.cursor = "crosshair";

    const onMapClick = (e: any) => {
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      const color = (window as any).__CLIENT_COLOR as string | undefined;
      const created = add({ title: "Pin", coordinates: [lng, lat], color });
      if (map && created)
        map.easeTo({ center: created.coordinates, duration: 400 });
      setIsPlacing(false);
    };

    // use once listener so it only triggers a single placement
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

  const addAtCenter = () => {
    // enter placement mode; clicking the map will place the pin
    setIsPlacing((s) => !s);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        top: 12,
        zIndex: 1001,
        pointerEvents: "auto",
      }}
    >
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

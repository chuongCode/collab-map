import { usePinsState, usePinsActions } from "../hooks/usePins";
import type { Map as MapboxMap } from "mapbox-gl";
import type { Pin } from "../types";

export default function PinList({ map }: { map?: MapboxMap | null }) {
  const { pins, selectedId } = usePinsState();
  const { select, del } = usePinsActions();

  const focus = (p: Pin) => {
    if (!map) return;
    map.easeTo({ center: p.coordinates as any, duration: 400 });
    select(p.id);
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        top: 12,
        zIndex: 10,
        background: "rgba(255,255,255,0.9)",
        padding: 8,
      }}
    >
      <div style={{ fontWeight: 600 }}>Pins</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {pins.map((p) => (
          <div
            key={p.id}
            style={{ display: "flex", gap: 6, alignItems: "center" }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: p.color || "#222",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.1) inset",
              }}
            />
            <button
              onClick={() => focus(p)}
              style={{ fontWeight: p.id === selectedId ? 700 : 400 }}
            >
              {p.title ?? "Pin"}
            </button>
            <button onClick={() => del(p.id)}>Del</button>
          </div>
        ))}
      </div>
    </div>
  );
}

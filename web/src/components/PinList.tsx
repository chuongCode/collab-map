import { usePinsState, usePinsActions } from "../hooks/usePins";
import type { Map as MapboxMap } from "mapbox-gl";
import type { Pin } from "../types";
import "../styles/pin-list.css";

export default function PinList({ map }: { map?: MapboxMap | null }) {
  const { pins, selectedId } = usePinsState();
  const { select, del } = usePinsActions();

  const focus = (p: Pin) => {
    if (!map) return;
    map.easeTo({ center: p.coordinates as any, duration: 400 });
    select(p.id);
  };

  return (
    <div className="pin-list-container">
      <div className="pin-list-title">Pins</div>
      <div className="pin-list-items">
        {pins.map((p) => (
          <div key={p.id} className="pin-list-item">
            <button
              className={p.id === selectedId ? "selected" : ""}
              onClick={() => focus(p)}
            >
              {p.title ?? "Pin"}
            </button>
            <button className="delete" onClick={() => del(p.id)}>
              Del
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

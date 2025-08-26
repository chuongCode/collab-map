import { useEffect, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { usePinsState, usePinsActions } from "../hooks/usePins";

export default function LeftPinPanel({ map }: { map?: MapboxMap | null }) {
  const { pins, selectedId } = usePinsState();
  const { select, del } = usePinsActions();

  const MIN_WIDTH = 240;
  const DEFAULT_WIDTH = 240;
  const MAX_WIDTH = 500;

  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [isOpen, setIsOpen] = useState(true);
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  // Fetch address for a single pin and cache it
  const fetchAddressForPin = async (pin: any) => {
    if (!MAPBOX_TOKEN) return;
    const [lng, lat] = pin.coordinates || [];
    if (typeof lng !== "number" || typeof lat !== "number") return;

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const feature = (data && data.features && data.features[0]) || null;
      const place = feature?.place_name || feature?.text || "";
      if (place) setAddresses((s) => ({ ...s, [pin.id]: place }));
    } catch (err) {
      // ignore network errors
    }
  };

  // Whenever pins change, fetch addresses for any pins we don't have cached
  useEffect(() => {
    if (!pins || pins.length === 0) return;
    for (const p of pins) if (!addresses[p.id]) fetchAddressForPin(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  // Listen for global selection mode events from InspectorPanel
  useEffect(() => {
    const onStart = () => {
      setSelectionMode(true);
      setHighlightedIds([]);
    };
    const onEnd = () => {
      setSelectionMode(false);
      setHighlightedIds([]);
    };
    window.addEventListener("route-selection-start", onStart as EventListener);
    window.addEventListener("route-selection-end", onEnd as EventListener);
    return () => {
      window.removeEventListener(
        "route-selection-start",
        onStart as EventListener
      );
      window.removeEventListener("route-selection-end", onEnd as EventListener);
    };
  }, []);

  // While selection mode is active, watch global selectedId and add to highlightedIds
  useEffect(() => {
    if (!selectionMode) return;
    if (!selectedId) return;
    setHighlightedIds((s) => (s.includes(selectedId) ? s : [...s, selectedId]));
  }, [selectedId, selectionMode]);

  const focus = (p: any) => {
    if (!map) return;
    map.easeTo({ center: p.coordinates as any, duration: 400 });
    select(p.id);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newW = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, Math.round(startWidth + delta))
      );
      setWidth(newW);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const startX = e.touches[0].clientX;
    const startWidth = width;
    const onMove = (ev: TouchEvent) => {
      const clientX = ev.touches[0]?.clientX ?? startX;
      const delta = clientX - startX;
      const newW = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, Math.round(startWidth + delta))
      );
      setWidth(newW);
    };
    const onEnd = () => {
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  };

  if (!isOpen) {
    return (
      <div className="fixed left-0 top-4 z-60">
        <button
          className="btn btn-square btn-sm bg-[#2c2c2c] border border-gray-700 text-white shadow-sm"
          onClick={() => setIsOpen(true)}
          aria-label="Open pins panel"
          title="Open pins panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full z-50 bg-[#2c2c2c] text-white shadow-lg border-r border-gray-700 overflow-hidden"
      style={{ width }}
      aria-label="Pins panel"
    >
      {/* resize handle on right edge */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize pins panel"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="absolute right-0 top-0 h-full -mr-1 w-2 cursor-ew-resize"
      />

      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-medium text-gray-100">Pins</h3>
        <div>
          <button
            className="btn btn-ghost btn-sm text-white p-2"
            onClick={() => setIsOpen(false)}
            aria-label="Collapse pins panel"
            title="Collapse pins panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="p-3 overflow-auto"
        style={{ maxHeight: "calc(100vh - 64px)" }}
      >
        <div className="flex flex-col gap-3">
          {pins.map((p) => {
            const addr = addresses[p.id];
            const shortAddr = addr
              ? addr.length > 40
                ? addr.slice(0, 39) + "…"
                : addr
              : "Loading address…";
            const title = p.title ?? "Pin";
            const compactLabel = `${title} - ${shortAddr}`;

            const isHighlighted =
              selectionMode && highlightedIds.includes(p.id);

            if (p.id === selectedId || isHighlighted) {
              return (
                <div
                  key={p.id}
                  className={`flex items-start justify-between gap-2 ${
                    isHighlighted ? "bg-[#3a3a3a]" : ""
                  }`}
                >
                  <div className="w-full">
                    <button
                      className={`text-left w-full px-2 py-1 rounded bg-[#3a3a3a] font-semibold`}
                      onClick={() => focus(p)}
                    >
                      {title}
                    </button>
                    <div className="text-xs text-gray-300 px-2 mt-1">
                      {addr ? (
                        addr.length > 60 ? (
                          addr.slice(0, 59) + "…"
                        ) : (
                          addr
                        )
                      ) : (
                        <span className="text-gray-500">Loading address…</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm text-red-400"
                    onClick={() => del(p.id)}
                    aria-label={`Delete pin ${p.title || p.id}`}
                  >
                    Del
                  </button>
                </div>
              );
            }

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-2 ${
                  isHighlighted ? "bg-[#2f2f2f]" : ""
                }`}
              >
                <button
                  className="text-left w-full px-2 py-1 rounded hover:bg-[#3a3a3a]"
                  onClick={() => focus(p)}
                  title={compactLabel}
                >
                  {compactLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

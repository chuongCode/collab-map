import { useEffect, useState } from "react";
import { fetchRouteGeoJSON } from "../lib/route";
import type { Map as MapboxMap } from "mapbox-gl";
import { usePinsActions, usePinsState } from "../hooks/usePins";
import InspectorControls from "./InspectorControls";

export default function InspectorPanel({ map }: { map?: MapboxMap | null }) {
  const { add, clear, clearRoute, setRoute, select } = usePinsActions();
  const { pins, selectedId } = usePinsState();
  const [isOpen, setIsOpen] = useState(true);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isSelectingRoute, setIsSelectingRoute] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const MIN_WIDTH = 240;
  const DEFAULT_WIDTH = 320;
  const MAX_WIDTH = 640;
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: MouseEvent) => {
      // anchored to right: moving mouse left increases width
      const delta = startX - ev.clientX;
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
      const delta = startX - clientX;
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
      if (map && created)
        map.easeTo({ center: created.coordinates, duration: 400 });
      setIsPlacing(false);
    };

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

  // Start selection mode where user must pick two existing pins on the map
  const startRouteSelection = () => {
    if (pins.length < 2) return;
    setSelectedIds([]);
    setIsSelectingRoute(true);
    // notify other UI that we're entering route-selection mode
    try {
      window.dispatchEvent(new CustomEvent("route-selection-start"));
    } catch (e) {}
  };

  const cancelRouteSelection = () => {
    setIsSelectingRoute(false);
    setSelectedIds([]);
    select(null);
    try {
      window.dispatchEvent(new CustomEvent("route-selection-end"));
    } catch (e) {}
  };

  // Watch the global selected pin id (set by clicking pins on the map). When in selection
  // mode, collect two distinct selections and fetch the route.
  useEffect(() => {
    if (!isSelectingRoute) return;
    if (!selectedId) return;
    if (selectedIds.includes(selectedId)) return;

    setSelectedIds((s) => {
      const next = [...s, selectedId];
      // once we have two selections, fetch route and exit selection mode
      if (next.length === 2) {
        const p1 = pins.find((p) => p.id === next[0]);
        const p2 = pins.find((p) => p.id === next[1]);
        if (p1 && p2) {
          (async () => {
            try {
              const route = await fetchRouteGeoJSON(
                p1.coordinates,
                p2.coordinates
              );
              if (route) {
                route.properties = {
                  ...route.properties,
                  fromId: p1.id,
                  toId: p2.id,
                } as any;
                setRoute(route);
              }
            } catch (err) {
              // ignore fetch errors for now
            }
          })();
        }
        // cleanup selection mode and clear map selection
        setIsSelectingRoute(false);
        select(null);
        try {
          window.dispatchEvent(new CustomEvent("route-selection-end"));
        } catch (e) {}
        return [];
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isSelectingRoute]);

  if (!isOpen) {
    return (
      <div className="fixed right-4 top-4 z-60">
        <button
          className="btn btn-square btn-sm bg-[#2c2c2c] border border-gray-700 text-white shadow-sm"
          onClick={() => setIsOpen(true)}
          aria-label="Open Panel"
          title="Open Panel"
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
    );
  }

  return (
    <aside
      className="fixed right-0 top-0 h-full z-50 bg-[#2c2c2c] text-white shadow-lg border-l border-gray-700"
      aria-label="Control panel"
      style={{ width }}
    >
      {/* Resize handle (anchor on left edge) */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="absolute left-0 top-0 h-full -ml-1 w-2 cursor-ew-resize"
      />
      <div
        className="flex items-center justify-between p-4 border-b border-gray-700"
        style={{ paddingRight: 8 }}
      >
        <h3 className="text-lg font-medium text-gray-100">Controls</h3>
        <div className="space-x-2">
          <button
            className="btn btn-ghost btn-sm text-white p-2"
            onClick={() => setIsOpen(false)}
            aria-label="Collapse Panel"
            title="Collapse Panel"
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
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <InspectorControls
        isPlacing={isPlacing}
        togglePinPlacement={togglePinPlacement}
        isSelectingRoute={isSelectingRoute}
        startRouteSelection={startRouteSelection}
        cancelRouteSelection={cancelRouteSelection}
        clearPins={() => clear()}
        clearRoute={() => clearRoute()}
        pinsCount={pins.length}
      />
    </aside>
  );
}

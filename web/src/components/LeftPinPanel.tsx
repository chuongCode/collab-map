import { useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { usePinsState, usePinsActions } from "../hooks/usePins";

export default function LeftPinPanel({ map }: { map?: MapboxMap | null }) {
  const { pins, selectedId } = usePinsState();
  const { select, del } = usePinsActions();

  const MIN_WIDTH = 200;
  const DEFAULT_WIDTH = 240;
  const MAX_WIDTH = 500;

  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [isOpen, setIsOpen] = useState(true);

  const focus = (p: any) => {
    if (!map) return;
    map.easeTo({ center: p.coordinates as any, duration: 400 });
    select(p.id);
  };

  // Resize handlers (panel anchored to left; dragging right increases width)
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
          {pins.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <button
                className={`text-left w-full px-2 py-1 rounded ${
                  p.id === selectedId
                    ? "bg-[#3a3a3a] font-semibold"
                    : "hover:bg-[#3a3a3a]"
                }`}
                onClick={() => focus(p)}
              >
                {p.title ?? "Pin"}
              </button>
              <button
                className="btn btn-ghost btn-sm text-red-400"
                onClick={() => del(p.id)}
                aria-label={`Delete pin ${p.title || p.id}`}
              >
                Del
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

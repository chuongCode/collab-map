import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { io } from "socket.io-client";
import type { CursorEvent, LiveUser } from "../types";

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE as string;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

type SocketClient = {
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, cb: (...args: any[]) => void) => void;
  disconnect: () => void;
};

type CursorMarker = {
  marker: mapboxgl.Marker;
  lastLngLat: [number, number];
  user?: LiveUser;
};

export default function Map() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const socketRef = useRef<SocketClient | null>(null);
  const [clientUser] = useState<LiveUser>({
    id: crypto.randomUUID(),
    initials: "YY",
  });
  const boardId = useMemo(() => "demo-board-1", []);
  const cursorMarkersRef = useRef<Record<string, CursorMarker>>({});

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-111.9, 40.76], // starting coords
      zoom: 10,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Socket.IO client
    const socket = io("http://localhost:8000", {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_board", { boardId, user: clientUser });
    });

    socket.on("cursor", (ev: CursorEvent) => {
      const key = ev.sid;
      const existing = cursorMarkersRef.current[key];

      const el = document.createElement("div");
      el.style.background = "#111";
      el.style.color = "#fff";
      el.style.borderRadius = "12px";
      el.style.padding = "2px 6px";
      el.style.fontSize = "12px";
      el.style.lineHeight = "16px";
      el.style.whiteSpace = "nowrap";
      el.style.pointerEvents = "none";
      el.textContent = ev.user?.initials ?? "??";

      const lngLat: [number, number] = [ev.lng, ev.lat];
      if (!existing) {
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(map);
        cursorMarkersRef.current[key] = {
          marker,
          lastLngLat: lngLat,
          user: ev.user,
        };
      } else {
        existing.marker.setLngLat(lngLat);
        existing.user = ev.user ?? existing.user;
        existing.lastLngLat = lngLat;
      }
    });

    socket.on("user_left", (payload: { sid: string }) => {
      const { sid } = payload;
      const existing = cursorMarkersRef.current[sid as string];
      if (existing) {
        existing.marker.remove();
        delete cursorMarkersRef.current[sid];
      }
    });

    // Emit local cursor while moving on map
    function handleMouseMove(
      e: mapboxgl.MapMouseEvent & { originalEvent: MouseEvent }
    ) {
      const { lng, lat } = e.lngLat;
      socket.emit("cursor", { lng, lat });
    }
    map.on("mousemove", handleMouseMove);

    return () => {
      map.off("mousemove", handleMouseMove);
      socket.emit("leave_board");
      socket.disconnect();
      map.remove();
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}

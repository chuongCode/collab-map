import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { io } from "socket.io-client";
import type { LiveUser } from "../types";
import { RemoteCursorManager } from "../lib/RemoteCursorManager";
import { CURSOR_COLORS } from "../lib/cursorColors";

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE as string;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export default function Map() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [clientUser] = useState<LiveUser>({
    id: crypto.randomUUID(),
    initials: "YY", // Placeholder initials
  });
  const boardId = useMemo(() => "demo-board-1", []);

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-77.63, 43.13],
      zoom: 15,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const socket = io("http://localhost:8000", { transports: ["websocket"] });
    socketRef.current = socket;

    const cursorManager = new RemoteCursorManager(map, CURSOR_COLORS);
    cursorManager.attach(socket);

    socket.on("connect", () => {
      socket.emit("join_board", { boardId, user: clientUser });
    });

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
      cursorManager.dispose();
      map.remove();
    };
  }, [boardId, clientUser]);

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}

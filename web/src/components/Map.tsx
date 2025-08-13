import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { io } from "socket.io-client";
import type { LiveUser } from "../types";
import { RemoteCursorManager } from "../lib/RemoteCursorManager";
import { CURSOR_COLORS } from "../lib/cursorColors";
import { useMapboxMap } from "../hooks/useMapboxMap";

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE as string;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clientUser] = useState<LiveUser>({
    id: crypto.randomUUID(),
    initials: "YY",
  });
  const boardId = useMemo(() => "demo-board-1", []);

  mapboxgl.accessToken = MAPBOX_TOKEN;
  const mapRef = useMapboxMap(containerRef, {
    style: MAP_STYLE,
    center: [-77.63, 43.13],
    zoom: 15,
  });

  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    const socket = io("http://localhost:8000", { transports: ["websocket"] });

    const cursorManager = new RemoteCursorManager(mapRef.current, CURSOR_COLORS);
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
    mapRef.current.on("mousemove", handleMouseMove);

    return () => {
      mapRef.current?.off("mousemove", handleMouseMove);
      socket.emit("leave_board");
      socket.disconnect();
      cursorManager.dispose();
    };
  }, [boardId, clientUser, mapRef]);

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}

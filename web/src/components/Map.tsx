import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LiveUser } from "../types";
import { RemoteCursorManager } from "../lib/RemoteCursorManager";
import { CURSOR_COLORS } from "../lib/cursorColors";
import { useMapboxMap } from "../hooks/useMapboxMap";
import { useSocket } from "../hooks/useSocket";
import { Notification } from "./Notification"; // <-- import your notification

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE as string;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clientUser] = useState<LiveUser>({
    id: crypto.randomUUID(),
    initials: "YY",
  });
  const boardId = useMemo(() => "demo-board-1", []);
  const socketRef = useSocket("http://localhost:8000", {
    transports: ["websocket"],
  });

  // Notification state
  const [notification, setNotification] = useState<string | null>(null);

  mapboxgl.accessToken = MAPBOX_TOKEN;
  const mapRef = useMapboxMap(containerRef, {
    style: MAP_STYLE,
    center: [-77.63, 43.13],
    zoom: 15,
  });

  // Sets up collaborative features on the map
  useEffect(() => {
    // if map or socket is not ready, exit early
    if (!mapRef.current || !socketRef.current) return;

    // Add navigation controls to the map
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    const socket = socketRef.current;

    const cursorManager = new RemoteCursorManager(
      mapRef.current,
      CURSOR_COLORS
    );
    cursorManager.attach(socket);

    // When the socket connects, it emits a join_board event with the board ID and user info, letting the server know this user has joined the board.
    socket.on("connect", () => {
      socket.emit("join_board", { boardId, user: clientUser });
    });


    //  Make built-in POIs clickable
mapRef.current.on("click", (e) => {
  const features = mapRef.current!.queryRenderedFeatures(e.point, {
    layers: ["poi-label"], // default POI layer in Mapbox styles
  });

  if (!features.length) return;

  const f = features[0];
  const coords = (f.geometry as GeoJSON.Point).coordinates;

  new mapboxgl.Popup()
  .setLngLat(coords as [number, number])
  .setHTML(
    `<strong>${f.properties?.name}</strong><br>${f.properties?.category || ""}`
  )
  
    .addTo(mapRef.current!);
});


    // Listen for user_joined event
    socket.on("user_joined", (user: LiveUser) => {
      if (user.id !== clientUser.id) {
        setNotification(`${user.initials} has joined the board!`);
      }
    });

    // Listen for user_left event
    socket.on("user_left", (user: LiveUser) => {
      if (user.id !== clientUser.id) {
        setNotification(`${user.initials} has left the board.`);
      }
    });

    // On every mouse move over the map, it emits the current longitude and latitude to the server via a cursor event. This enables real-time cursor sharing.
    function handleMouseMove(
      e: mapboxgl.MapMouseEvent & { originalEvent: MouseEvent }
    ) {
      const { lng, lat } = e.lngLat;
      socket.emit("cursor", { lng, lat });
    }
    mapRef.current.on("mousemove", handleMouseMove);

    // When the component unmounts, it removes the mouse move listener, emits a leave_board event to notify the server that this user has left the board, and disposes of the cursor manager.
    return () => {
      mapRef.current?.off("mousemove", handleMouseMove);
      socket.emit("leave_board");
      cursorManager.dispose();
      socket.off("user_joined");
      socket.off("user_left");
    };

    



  }, [boardId, clientUser, mapRef, socketRef]);

  return (
    <>
      <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />
      {notification && (
        <Notification
          message={notification}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
}

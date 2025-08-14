import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LiveUser, LiveUserWithColor } from "../types";
import { RemoteCursorManager } from "../lib/RemoteCursorManager";
import { useMapboxMap } from "../hooks/useMapboxMap";
import { useSocket } from "../hooks/useSocket";
import { Notification } from "./Notification";

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
  const [notification, setNotification] = useState<{
    message: string;
    color?: string;
  } | null>(null);

  // User list state (from server)
  const [userList, setUserList] = useState<LiveUserWithColor[]>([]);

  mapboxgl.accessToken = MAPBOX_TOKEN;
  const mapRef = useMapboxMap(containerRef, {
    style: MAP_STYLE,
    center: [-77.63, 43.13],
    zoom: 15,
  });

  // Ref to always have the latest userList (if needed elsewhere)
  const userListRef = useRef(userList);
  useEffect(() => {
    userListRef.current = userList;
  }, [userList]);

  // Sets up collaborative features on the map
  useEffect(() => {
    if (!mapRef.current || !socketRef.current) return;

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    const socket = socketRef.current;

    // Attach RemoteCursorManager (now only relays, does not assign colors)
    const cursorManager = new RemoteCursorManager(mapRef.current);
    cursorManager.attach(socket);

    // On connect, join board
    socket.on("connect", () => {
      socket.emit("join_board", { boardId, user: clientUser });
    });

    // Listen for user list updates
    socket.on("user_list", (payload: { users: LiveUserWithColor[] }) => {
      setUserList(payload.users || []);
    });

    // Listen for join/leave notifications (use userList for color)
    socket.on(
      "user_joined",
      (payload: { sid: string; user: LiveUserWithColor }) => {
        const { user } = payload;
        if (user.id !== clientUser.id) {
          setNotification({
            message: `${user.initials} has joined the board!`,
            color: user.color,
          });
        }
      }
    );
    socket.on(
      "user_left",
      (payload: { sid: string; user: LiveUserWithColor }) => {
        const { user } = payload;
        if (user.id !== clientUser.id) {
          setNotification({
            message: `${user.initials} has left the board.`,
            color: user.color,
          });
        }
      }
    );

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
      cursorManager.dispose();
      socket.off("user_list");
      socket.off("user_joined");
      socket.off("user_left");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, clientUser, mapRef, socketRef]);

  return (
    <>
      <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />
      {notification && (
        <Notification
          message={notification.message}
          userColor={notification.color}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
}

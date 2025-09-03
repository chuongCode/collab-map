import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LiveUser, LiveUserWithColor } from "../types";
import { RemoteCursorManager } from "../lib/RemoteCursorManager";
import { useMapboxMap } from "../hooks/useMapboxMap";
import { useSocket } from "../hooks/useSocket";
import { toast } from "react-hot-toast";
import PinLayer from "./PinLayer";
import InspectorPanel from "./InspectorPanel";
import LeftPinPanel from "./LeftPinPanel";
import { fetchRouteGeoJSON } from "../lib/route";
import { usePinsActions } from "../hooks/usePins";

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE as string;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  // Build clientUser from stored auth if present, otherwise a temporary anonymous user
  const stored =
    typeof window !== "undefined" ? localStorage.getItem("collab_user") : null;
  const parsed = stored ? JSON.parse(stored) : null;
  try {
    console.debug("stored collab_user", parsed?.user);
  } catch (e) {}
  const initialUser = parsed?.user ?? {
    id: crypto.randomUUID(),
    initials: "YY",
  };
  const [clientUser] = useState<LiveUser>(initialUser);
  const boardId = useMemo(() => "demo-board-1", []);
  const socketRef = useSocket("http://localhost:8000", {
    transports: ["websocket"],
    auth: { id_token: parsed?.id_token },
  });

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

  const { setRoute } = usePinsActions();

  // Keep a stateful reference to the map so child components re-render when the map is created
  const [mapObj, setMapObj] = useState<mapboxgl.Map | null>(null);
  useEffect(() => {
    if (mapRef.current && mapObj !== mapRef.current) setMapObj(mapRef.current);
  }, [mapRef, mapObj]);

  // Sets up collaborative features on the map
  useEffect(() => {
    if (!mapRef.current || !socketRef.current) return;

    // Add navigation controls to the map
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");

    const socket = socketRef.current;

    const cursorManager = new RemoteCursorManager(mapRef.current);
    cursorManager.attach(socket);

    (mapRef as any).__cursorManager = cursorManager;

    // On connect, join board
    socket.on("connect", () => {
      socket.emit("join_board", { boardId, user: clientUser });
    });

    // Listen for user list updates
    socket.on("user_list", (payload: { users: LiveUserWithColor[] }) => {
      // debug: log incoming user list to verify picture field
      try {
        console.debug("socket user_list", payload);
      } catch (e) {}
      setUserList(payload.users || []);
      // try to find our client user and expose color to other UI (PinControls)
      try {
        const me = (payload.users || []).find((u) => u.id === clientUser.id);
        // @ts-ignore
        window.__CLIENT_COLOR = me?.color;
      } catch (e) {}
    });

    // Listen for join/leave notifications (use userList for color)
    socket.on(
      "user_joined",
      (payload: { sid: string; user: LiveUserWithColor }) => {
        const { user } = payload;
        try {
          // eslint-disable-next-line no-console
          console.debug("socket user_joined", user);
        } catch (e) {}
        if (user.id !== clientUser.id) {
          toast(`${user.initials} has joined the board!`, {
            duration: 3000,
            // use an inset left accent so the pill stays rounded
            style: {
              boxShadow: `inset 6px 0 0 0 ${user.color || "#222"}`,
              paddingLeft: "12px",
            },
          });
        }
      }
    );
    socket.on(
      "user_left",
      (payload: { sid: string; user: LiveUserWithColor }) => {
        const { user } = payload;
        if (user.id !== clientUser.id) {
          toast(`${user.initials} has left the board.`, {
            duration: 3000,
            style: {
              boxShadow: `inset 6px 0 0 0 ${user.color || "#222"}`,
              paddingLeft: "12px",
            },
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
  }, [boardId, clientUser, mapRef, socketRef]);

  // focus a remote user's last known cursor position
  const focusUserById = (sid?: string) => {
    try {
      const cm: any = (mapRef as any).__cursorManager;
      console.debug(
        "focusUserById: cursorManager:",
        !!cm,
        "hasMethod:",
        !!cm?.getLastLngLatForUserId
      );
      let lnglat: [number, number] | undefined =
        cm?.getLastLngLatForUserId(sid);
      if (!lnglat) {
        // fallback: maybe `sid` is actually a socket sid stored as marker key
        lnglat = cm?.getLastLngLatForSid?.(sid);
      }
      console.debug(
        "focusUserById: resolved lnglat:",
        lnglat,
        "for id/sid:",
        sid
      );
      if (lnglat && mapRef.current) {
        mapRef.current.easeTo({ center: lnglat, duration: 500 });
        return;
      }
      // if we reach here, no known cursor location
      console.debug("focusUserById: no known cursor for", sid);
      toast("No recent cursor position for that user.", {
        duration: 3000,
        style: { boxShadow: `inset 6px 0 0 0 #666`, paddingLeft: "12px" },
      });
    } catch (e) {}
  };

  // Listen for route requests from UI
  useEffect(() => {
    const handler = async (e: Event) => {
      // @ts-ignore
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { from, to, fromId, toId } = detail as {
        from: [number, number];
        to: [number, number];
        fromId?: string;
        toId?: string;
      };
      const route = await fetchRouteGeoJSON(from, to);
      if (route) {
        // store the pin ids as properties so we can invalidate the route if pins change
        route.properties = { ...route.properties, fromId, toId } as any;
        setRoute(route);
      }
    };
    window.addEventListener("request-route", handler as EventListener);
    return () =>
      window.removeEventListener("request-route", handler as EventListener);
  }, [setRoute]);

  return (
    <>
      <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />
      <PinLayer map={mapObj} />
      <InspectorPanel
        map={mapObj}
        users={userList}
        currentUserId={clientUser.id}
        onFocusUser={(id?: string) => focusUserById(id)}
      />
      <LeftPinPanel map={mapObj} />
      <LeftPinPanel map={mapObj} />
    </>
  );
}

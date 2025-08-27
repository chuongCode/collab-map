import mapboxgl from "mapbox-gl";
import type { CursorEvent, LiveUser } from "../types";
import { createRemoteCursorEl } from "./cursorElement";

type CursorMarker = {
  marker: mapboxgl.Marker;
  lastLngLat: [number, number];
  user?: LiveUser;
};

type SocketLike = {
  id?: string;
  on: (event: string, cb: (...args: any[]) => void) => void;
  off?: (event: string, cb: (...args: any[]) => void) => void;
};

// No color assignment here; color comes from server
export class RemoteCursorManager {
  private map: mapboxgl.Map;
  private markers: Record<string, CursorMarker> = {};

  constructor(map: mapboxgl.Map) {
    this.map = map;
  }

  // Return the last known lng/lat for a remote session id, or undefined
  getLastLngLatForSid(sid?: string): [number, number] | undefined {
    if (!sid) return undefined;
    const m = this.markers[sid];
    return m ? m.lastLngLat : undefined;
  }

  // Return the last known lng/lat for a user id (user.id), searching markers' user field
  getLastLngLatForUserId(userId?: string): [number, number] | undefined {
    if (!userId) return undefined;
    for (const k of Object.keys(this.markers)) {
      const m = this.markers[k];
      if (m.user && (m.user as any).id === userId) return m.lastLngLat;
    }
    return undefined;
  }

  attach(socket: SocketLike) {
    const onCursor = (ev: CursorEvent & { color?: string }) => {
      if (ev.sid && socket.id && ev.sid === socket.id) return; // ignore self

      const key = ev.sid;
      const color = ev.color || "#222";
      const el = createRemoteCursorEl(ev.user?.initials ?? "??", color);
      const lngLat: [number, number] = [ev.lng, ev.lat];

      const existing = this.markers[key];
      if (!existing) {
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: "top-left",
          offset: [-12, -14],
        })
          .setLngLat(lngLat)
          .addTo(this.map);

        this.markers[key] = { marker, lastLngLat: lngLat, user: ev.user };
      } else {
        existing.marker.setLngLat(lngLat);
        existing.lastLngLat = lngLat;
        existing.user = ev.user ?? existing.user;
      }
    };

    const onUserLeft = (payload: { sid: string; user?: LiveUser }) => {
      const { sid } = payload;
      const existing = this.markers[sid];
      if (existing) {
        existing.marker.remove();
        delete this.markers[sid];
      }
    };

    socket.on("cursor", onCursor);
    socket.on("user_left", onUserLeft);
  }

  dispose() {
    Object.values(this.markers).forEach((m) => m.marker.remove());
    this.markers = {};
  }
}

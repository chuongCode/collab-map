import mapboxgl from "mapbox-gl";
import type { CursorEvent, LiveUser } from "../types";
import { ColorAssigner } from "./colorAssigner";
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

export class RemoteCursorManager {
  private map: mapboxgl.Map;
  private markers: Record<string, CursorMarker> = {};
  private colors: ColorAssigner;

  constructor(map: mapboxgl.Map, palette: string[]) {
    this.map = map;
    this.colors = new ColorAssigner(palette);
  }

  attach(socket: SocketLike) {
    const onCursor = (ev: CursorEvent) => {
      if (ev.sid && socket.id && ev.sid === socket.id) return; // ignore self

      const key = ev.sid;
      const color = this.colors.get(key);
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

    const onUserLeft = (payload: { sid: string }) => {
      const { sid } = payload;
      const existing = this.markers[sid];
      if (existing) {
        existing.marker.remove();
        delete this.markers[sid];
      }
      this.colors.release(sid);
    };

    socket.on("cursor", onCursor);
    socket.on("user_left", onUserLeft);
  }

  dispose() {
    Object.values(this.markers).forEach((m) => m.marker.remove());
    this.markers = {};
    this.colors.reset();
  }
}
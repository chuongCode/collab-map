export type LiveUser = {
  id: string;
  name?: string;
  initials?: string;
};
// Extend LiveUser to include color (from server)
export type LiveUserWithColor = LiveUser & { color?: string };

export type CursorEvent = {
  sid: string;
  lng: number;
  lat: number;
  user?: LiveUser;
};

// Pin and Route types for the pins / routing feature
export type Pin = {
  id: string;
  title?: string;
  // [lng, lat]
  coordinates: [number, number];
};

export type Route = {
  // GeoJSON Feature LineString
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties?: Record<string, any> | null;
};

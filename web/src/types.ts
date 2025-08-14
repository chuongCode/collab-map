export type FeaturePoint = {
  id: string;
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { title?: string };
};
export type FeatureCollection = {
  type: "FeatureCollection";
  features: FeaturePoint[];
};

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

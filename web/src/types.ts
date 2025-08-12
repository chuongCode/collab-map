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

export type CursorEvent = {
  sid: string;
  lng: number;
  lat: number;
  user?: LiveUser;
};

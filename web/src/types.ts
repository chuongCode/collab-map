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

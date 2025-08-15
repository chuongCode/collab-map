import type { Route } from "../types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export async function fetchRouteGeoJSON(
  from: [number, number],
  to: [number, number]
): Promise<Route | null> {
  if (!MAPBOX_TOKEN) return null;
  const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) return null;

  const geom = data.routes[0].geometry;
  const feature: Route = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: geom.coordinates },
    properties: { distance: data.routes[0].distance, duration: data.routes[0].duration },
  };

  return feature;
}

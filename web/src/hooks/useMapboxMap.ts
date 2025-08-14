import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import mapboxgl from "mapbox-gl";

type MapboxOptionsWithoutContainer = Omit<mapboxgl.MapboxOptions, "container">;

export function useMapboxMap(
  containerRef: RefObject<HTMLDivElement | null>,
  options: MapboxOptionsWithoutContainer
) {
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({ ...options, container: containerRef.current });
    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [containerRef, JSON.stringify(options)]);

  return mapRef;
}
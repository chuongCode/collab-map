import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import mapboxgl from "mapbox-gl";
import pinUrl from "../assets/Map pin.svg";

const PINS_SOURCE_ID = "pins";
const ROUTE_SOURCE_ID = "route";
const PINS_LAYER_ID = "pins-layer";
const ROUTE_LAYER_ID = "route-layer";

type MapboxOptionsWithoutContainer = Omit<mapboxgl.MapboxOptions, "container">;

export function useMapboxMap(
  containerRef: RefObject<HTMLDivElement | null>,
  options: MapboxOptionsWithoutContainer
) {
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      ...options,
      container: containerRef.current,
    });
    mapRef.current = map;

    // Centralized initialization for shared map layers/sources/images.
    // Use a guard on the map object to avoid double-initialization across HMR or
    // multiple mounts.
    const initLayers = () => {
      try {
        // prevent running multiple times
        // @ts-ignore
        if (map.__collabLayersInitialized) return;

        // create sources if missing
        try {
          if (!map.getSource(PINS_SOURCE_ID)) {
            map.addSource(PINS_SOURCE_ID, {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
          }
        } catch (e) {}

        try {
          if (!map.getSource(ROUTE_SOURCE_ID)) {
            map.addSource(ROUTE_SOURCE_ID, {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
          }
        } catch (e) {}

        // add default route layer if missing
        try {
          if (!map.getLayer(ROUTE_LAYER_ID)) {
            map.addLayer({
              id: ROUTE_LAYER_ID,
              type: "line",
              source: ROUTE_SOURCE_ID,
              paint: {
                "line-color": "#ff7e5f",
                "line-width": 4,
              },
            });
          }
        } catch (e) {}

        // try to load custom pin image and add symbol layer (SDF for tinting)
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            try {
              if (!(map.hasImage && map.hasImage("custom-pin"))) {
                try {
                  map.addImage("custom-pin", img, { sdf: true });
                } catch (err) {}
              }
            } catch (err) {}

            const addPinLayer = () => {
              try {
                if (!map.getLayer(PINS_LAYER_ID)) {
                  map.addLayer({
                    id: PINS_LAYER_ID,
                    type: "symbol",
                    source: PINS_SOURCE_ID,
                    layout: {
                      "icon-image": "custom-pin",
                      "icon-size": 0.6,
                      "icon-allow-overlap": true,
                      "icon-ignore-placement": true,
                      "icon-anchor": "bottom",
                    },
                    paint: {
                      "icon-color": ["coalesce", ["get", "color"], "#222"],
                    },
                  });
                }

                if (!map.getLayer("pins-hole")) {
                  map.addLayer({
                    id: "pins-hole",
                    type: "circle",
                    source: PINS_SOURCE_ID,
                    paint: {
                      "circle-color": "#fff",
                      "circle-radius": 5,
                      "circle-stroke-color": "rgba(0,0,0,0.08)",
                      "circle-stroke-width": 1,
                      "circle-translate": [0, -20],
                      "circle-translate-anchor": "viewport",
                    },
                  });
                }
              } catch (err) {
                try {
                  if (!map.getLayer(PINS_LAYER_ID)) {
                    map.addLayer({
                      id: PINS_LAYER_ID,
                      type: "symbol",
                      source: PINS_SOURCE_ID,
                      layout: {
                        "icon-image": "marker-15",
                        "icon-size": 1.2,
                        "icon-allow-overlap": true,
                        "icon-anchor": "bottom",
                      },
                      paint: {},
                    });
                  }
                } catch (e) {}
              }
            };

            try {
              if (
                typeof map.isStyleLoaded === "function" &&
                !map.isStyleLoaded()
              ) {
                map.once("load", addPinLayer);
              } else {
                addPinLayer();
              }
            } catch (e) {
              try {
                map.once("load", addPinLayer);
              } catch (ee) {}
            }
          };
          img.onerror = () => {
            const tryAddFallback = () => {
              try {
                if (!map.getLayer(PINS_LAYER_ID)) {
                  map.addLayer({
                    id: PINS_LAYER_ID,
                    type: "symbol",
                    source: PINS_SOURCE_ID,
                    layout: {
                      "icon-image": "marker-15",
                      "icon-size": 1.2,
                      "icon-allow-overlap": true,
                      "icon-anchor": "bottom",
                    },
                    paint: {},
                  });
                }
              } catch (e) {}
            };
            try {
              if (
                typeof map.isStyleLoaded === "function" &&
                !map.isStyleLoaded()
              ) {
                map.once("load", tryAddFallback);
              } else {
                tryAddFallback();
              }
            } catch (e) {
              try {
                map.once("load", tryAddFallback);
              } catch (ee) {}
            }
          };
          img.src = pinUrl as string;
        } catch (err) {}

        // mark initialized to avoid duplicate runs
        // @ts-ignore
        map.__collabLayersInitialized = true;
      } catch (err) {
        // swallow; map may not be ready yet
      }
    };

    // Run init when style is ready
    try {
      if (typeof map.isStyleLoaded === "function" && !map.isStyleLoaded()) {
        map.once("load", initLayers);
      } else {
        initLayers();
      }
    } catch (e) {
      try {
        map.once("load", initLayers);
      } catch (ee) {}
    }

    const onStyle = () => initLayers();
    map.on("styledata", onStyle);

    // cleanup when map removed
    const removeWatchers = () => {
      try {
        map.off("styledata", onStyle);
      } catch (e) {}
    };

    return () => {
      removeWatchers();
      map.remove();
    };
  }, [containerRef, JSON.stringify(options)]);

  return mapRef;
}

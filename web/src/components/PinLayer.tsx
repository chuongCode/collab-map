import { useEffect, useRef } from "react";
// using `any` for map types here to keep file simple and avoid type import issues
import { usePinsState, usePinsActions } from "../hooks/usePins";
import type { Pin } from "../types";
import pinUrl from "../assets/Map pin.svg";

const PINS_SOURCE_ID = "pins";
const ROUTE_SOURCE_ID = "route";
const PINS_LAYER_ID = "pins-layer";
const ROUTE_LAYER_ID = "route-layer";

export default function PinLayer({ map }: { map?: any | null }) {
  const { pins, selectedId, route } = usePinsState();
  const { update, select } = usePinsActions();
  const draggingRef = useRef<{ id: string; start: [number, number] } | null>(null);

  // Initialize sources and layers once
  useEffect(() => {
    if (!map) return;

    const init = () => {
      try {
        if (!map.getSource(PINS_SOURCE_ID)) {
          map.addSource(PINS_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        if (!map.getLayer(PINS_LAYER_ID)) {
          // Try to load a custom SVG image and add it as an icon
          try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              try {
                // addImage accepts HTMLImageElement; don't use SDF so original colors are preserved
                map.addImage("custom-pin", img, { sdf: false });
              } catch (err) {
                // ignore (image might already exist)
              }

              // add the symbol layer using the custom image
              try {
                map.addLayer({
                  id: PINS_LAYER_ID,
                  type: "symbol",
                  source: PINS_SOURCE_ID,
                  layout: {
                    "icon-image": "custom-pin",
                    // shrink the icon so it fits the map better
                    "icon-size": 0.6,
                    "icon-allow-overlap": true,
                    "icon-ignore-placement": true,
                    "icon-anchor": "bottom",
                  },
                  paint: {},
                });
              } catch (err) {
                // fallback to marker if adding symbol fails
                try {
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
                } catch (e) {
                  // ignore
                }
              }
            };
            img.onerror = () => {
              // fallback to default marker if image fails to load
              try {
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
              } catch (e) {}
            };
            img.src = pinUrl as string;
          } catch (err) {
            // symbol may fail if sprite not available; ignore
          }
        }

        if (!map.getSource(ROUTE_SOURCE_ID)) {
          map.addSource(ROUTE_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

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
      } catch (err) {
        // init may fail if style not ready; ignore and rely on load/styledata listeners
      }
    };

    // If style is ready, init now, otherwise wait for load
    try {
      if (typeof map.isStyleLoaded === "function") {
        if (map.isStyleLoaded()) init();
        else map.once("load", init);
      } else {
        // conservative: attach to load
        map.once("load", init);
      }
    } catch (err) {
      map.once("load", init);
    }

    // Ensure re-init after style changes
    const onStyle = () => init();
    map.on("styledata", onStyle);

    return () => {
      map.off("styledata", onStyle);
    };
  }, [map]);

  // Sync pins data to map source
  useEffect(() => {
    if (!map) return;

    // Ensure the pins source exists before setting data
    if (!map.getSource(PINS_SOURCE_ID)) {
      try {
        map.addSource(PINS_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      } catch (err) {
        // ignore if source already exists or style not ready
      }
    }

    const source = map.getSource(PINS_SOURCE_ID) as any;
    const fc = {
      type: "FeatureCollection",
      features: pins.map((p: Pin) => ({
        type: "Feature",
        id: p.id,
        geometry: { type: "Point", coordinates: p.coordinates },
        properties: { title: p.title, _id: p.id },
      })),
    };

    // debug
  // removed debug log

    try {
      source?.setData(fc as any);
    } catch (err) {
      // setData may fail if source isn't ready; ignore
    }
  }, [map, pins]);

  // Sync route
  useEffect(() => {
    if (!map) return;
  const src = map.getSource(ROUTE_SOURCE_ID) as any | undefined;
    if (!route) {
      src?.setData({ type: "FeatureCollection", features: [] } as any);
    } else {
      src?.setData({ type: "FeatureCollection", features: [route] } as any);
    }
  }, [map, route]);

  // Click to select
  useEffect(() => {
    if (!map) return;
    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [PINS_LAYER_ID] });
      if (!features || features.length === 0) return;
      const f: any = features[0];
      const id = (f.properties && f.properties._id) || f.id;
      if (id) select(id as string);
    };
  map.on("click", onClick);
  return () => { map.off("click", onClick); };
  }, [map, select]);

  // Dragging implementation using pointer events
  useEffect(() => {
    if (!map) return;

    let canvas = map.getCanvas();
    let isPointerDown = false;
    let activeId: string | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (!map) return;
      const rect = canvas.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const features = map.queryRenderedFeatures(point as any, { layers: [PINS_LAYER_ID] });
      if (!features || features.length === 0) return;
      const f: any = features[0];
      activeId = f.id as string | undefined ?? null;
      if (activeId) {
        isPointerDown = true;
        draggingRef.current = { id: activeId, start: [e.clientX, e.clientY] };
        // capture pointer to continue receiving move/up
        (e.target as Element).setPointerCapture?.((e as any).pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown || !activeId || !map) return;
      const lngLat = map.unproject([e.clientX, e.clientY]);
      update(activeId, { coordinates: [lngLat.lng, lngLat.lat] });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isPointerDown) {
        isPointerDown = false;
        activeId = null;
        draggingRef.current = null;
        try {
          (e.target as Element).releasePointerCapture?.((e as any).pointerId);
        } catch (err) {}
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [map, update]);

  // Highlight selection by using a filter on the layer's icon-color or by adding an outline layer; since symbol layer has no color, we'll use circle layer for highlight
  useEffect(() => {
    if (!map) return;
    const highlightLayerId = "pins-highlight";
    try {
      // Only try to add the layer when the style is ready
      if ((typeof map.isStyleLoaded === "function" && map.isStyleLoaded()) || true) {
        if (!map.getLayer(highlightLayerId)) {
          try {
            map.addLayer({
              id: highlightLayerId,
              type: "circle",
              source: PINS_SOURCE_ID,
              paint: {
                "circle-radius": 12,
                "circle-color": "rgba(0,0,0,0)",
                "circle-stroke-color": "#007aff",
                "circle-stroke-width": 3,
              },
              filter: ["==", ["get", "_id"], ""],
            } as any);
          } catch (err) {
            // ignore addLayer errors if style/sprite not ready
            // eslint-disable-next-line no-console
            console.warn("PinLayer: failed to add highlight layer, will try later", err);
          }
        }

        const layer = map.getLayer(highlightLayerId);
        if (layer) {
          try {
            const filter = selectedId ? ["==", ["get", "_id"], selectedId] : ["==", ["get", "_id"], ""];
            // @ts-ignore
            map.setFilter(highlightLayerId, filter);
          } catch (err) {
            // ignore setFilter errors
          }
        }
      }
    } catch (err) {
      // defensive: log and continue
      // eslint-disable-next-line no-console
      console.warn("PinLayer highlight effect failed", err);
    }
  }, [map, selectedId]);

  return null;
}

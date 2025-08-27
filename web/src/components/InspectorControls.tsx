type Props = {
  isPlacing: boolean;
  togglePinPlacement: () => void;
  isSelectingRoute: boolean;
  startRouteSelection: () => void;
  cancelRouteSelection: () => void;
  clearPins: () => void;
  clearRoute: () => void;
  pinsCount: number;
};

export default function InspectorControls({
  isPlacing,
  togglePinPlacement,
  isSelectingRoute,
  startRouteSelection,
  cancelRouteSelection,
  clearPins,
  clearRoute,
  pinsCount,
}: Props) {
  return (
    <div
      className="p-4 space-y-4 overflow-auto text-gray-200"
      style={{ maxHeight: "calc(100vh - 64px)" }}
    >
      <section>
        <div className="flex flex-col gap-2">
          <button
            className={`btn ${
              isPlacing ? "btn-success" : "btn-outline"
            } text-white`}
            onClick={togglePinPlacement}
          >
            {isPlacing ? "Placing: Click map" : "Add Pin"}
          </button>

          {!isSelectingRoute ? (
            <button
              className="btn btn-accent text-white"
              onClick={startRouteSelection}
              style={{ backgroundColor: "#039855" }}
            >
              Route (select 2)
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                className="btn btn-primary text-white"
                onClick={cancelRouteSelection}
              >
                Cancel
              </button>
              <div className="text-sm self-center text-gray-300">
                Select two pins on the map
              </div>
            </div>
          )}

          <button
            className="btn btn-warning text-white"
            onClick={clearPins}
            style={{ backgroundColor: "#DC6803" }}
          >
            Clear Pins
          </button>

          <button className="btn btn-outline text-white" onClick={clearRoute}>
            Clear Route
          </button>
        </div>
      </section>

      <section>
        <div className="font-semibold mb-2 text-gray-100">Total Pins</div>
        <div className="text-sm text-gray-300">{pinsCount} pins on board</div>
      </section>

      <section>
        <div className="font-semibold mb-2 text-gray-100">Shortcuts</div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm text-white">
            Reset View
          </button>
          <button className="btn btn-ghost btn-sm text-white">Center</button>
        </div>
      </section>
    </div>
  );
}

import Map from "./components/Map";
import Login from "./components/Login";
import "./App.css";
import { useState } from "react";

function App() {
  const [_, setTick] = useState(0);
  const stored = localStorage.getItem("collab_user");
  const user = stored ? JSON.parse(stored) : null;

  // Developer convenience: allow anonymous sessions in dev via ?anon=true
  if (!user) {
    try {
      const params = new URLSearchParams(window.location.search);
      const allowAnon = params.get("anon") === "true";
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      if (allowAnon && isLocal) {
        // predictable dev user so multi-window tests are easier
        const devUser = {
          id: `dev-${Math.floor(Math.random() * 10000)}`,
          initials: "DV",
          name: "Developer",
        };
        localStorage.setItem(
          "collab_user",
          JSON.stringify({ user: devUser, id_token: null })
        );
        // force a re-render by bumping tick
        setTick((t) => t + 1);
        return null; // render nothing this tick while state updates
      }
    } catch (e) {}
  }

  // Only mount Map when a (verified) collab_user exists (or dev anon was created above).
  return user ? <Map /> : <Login onLogin={() => setTick((t) => t + 1)} />;
}

export default App;

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/cursor.css";
import App from "./App.tsx";
import { Toaster } from "react-hot-toast";

document.body.classList.add('use-custom-cursor');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
  <App />
  <Toaster
    position="bottom-center"
    toastOptions={{
      // Default options for all toasts
      duration: 3000,
      style: {
        background: '#111827', // dark gray (Tailwind slate-900-like)
        color: '#f9fafb', // near-white text
        boxShadow: '0 6px 22px rgba(2,6,23,0.7)',
        borderRadius: '9999px', // pill-shaped
        padding: '8px 16px',
      },
    }}
  />
  </StrictMode>
);

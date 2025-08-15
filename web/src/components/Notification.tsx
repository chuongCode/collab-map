import React, { useEffect, useRef, useState } from "react";

type NotificationProps = {
  message: string;
  onClose: () => void;
  userColor?: string; // renamed for clarity
  duration?: number; // ms before auto-dismiss, default 3000
};

export function Notification({
  message,
  onClose,
  userColor = "#222",
  duration = 3000,
}: NotificationProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => setVisible(false), duration);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [duration]);

  // Fade out before unmounting
  useEffect(() => {
    if (!visible) {
      const fadeTimeout = setTimeout(onClose, 400); // match fade-out animation
      return () => clearTimeout(fadeTimeout);
    }
  }, [visible, onClose]);

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 40,
        transform: "translateX(-50%)",
        zIndex: 9999,
        pointerEvents: "auto",
        background: "none",
      }}
    >
      <div
        className={`notification-pill${!visible ? " notification-exit" : ""}`}
        style={{
          backgroundColor: userColor,
          color: "#fff",
          borderRadius: 999,
          padding: "12px 28px 12px 20px",
          minWidth: 120,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          fontSize: 16,
          fontWeight: 500,
          gap: 12,
          position: "relative",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        tabIndex={0}
        role="alert"
        aria-live="assertive"
      >
        <span style={{ flex: 1 }}>{message}</span>
        <button
          onClick={() => setVisible(false)}
          aria-label="Close notification"
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            fontSize: 20,
            fontWeight: "bold",
            cursor: "pointer",
            marginLeft: 8,
            lineHeight: 1,
            padding: 0,
            outline: "none",
          }}
        >
          ×
        </button>
      </div>
      <style>
        {`
        .notification-pill {
          animation: notification-bounce-in 0.7s cubic-bezier(.68,-0.55,.27,1.55);
          opacity: 1;
          animation-fill-mode: both;
        }
        @keyframes notification-bounce-in {
          0% {
            opacity: 0;
            transform: translateY(60px) scale(0.95);
          }
          60% {
            opacity: 1;
            transform: translateY(-10px) scale(1.05);
          }
          80% {
            transform: translateY(2px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .notification-exit {
          animation: notification-fade-out 0.4s forwards;
        }
        @keyframes notification-fade-out {
          to {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
        }
        `}
      </style>
    </div>
  );
}

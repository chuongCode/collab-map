import { useEffect, useRef, useState } from "react";
import "../styles/notification.css";

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
    <div className="notification-container">
      <div
        className={`notification-pill${!visible ? " notification-exit" : ""}`}
        style={{ "--user-color": userColor } as React.CSSProperties}
        tabIndex={0}
        role="alert"
        aria-live="assertive"
      >
        <span className="message">{message}</span>
        <button
          className="close-button"
          onClick={() => setVisible(false)}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}

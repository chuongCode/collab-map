import React from "react";

type NotificationProps = {
  message: string;
  onClose: () => void;
};

export function Notification({ message, onClose }: NotificationProps) {
  return (
    <div style={{
      position: "fixed",
      top: 20,
      right: 20,
      background: "#222",
      color: "#fff",
      padding: "12px 24px",
      borderRadius: 8,
      zIndex: 9999,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
    }}>
      {message}
      <button style={{ marginLeft: 16 }} onClick={onClose}>Close</button>
    </div>
  );
}
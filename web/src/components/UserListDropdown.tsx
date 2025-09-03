import { useEffect, useRef, useState } from "react";

type User = {
  id: string;
  name?: string;
  initials?: string;
  color?: string;
  picture?: string;
};

export default function UserListDropdown({
  users = [],
  currentUserId,
  maxVisible = 4,
  onOpen,
  onClose,
  onUserClick,
}: {
  users?: User[];
  currentUserId?: string;
  maxVisible?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onUserClick?: (id?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocPointer = (ev: MouseEvent | TouchEvent) => {
      if (!open) return;
      const target = ev.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
        onClose?.();
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setOpen(false);
        onClose?.();
      }
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("touchstart", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("touchstart", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !currentUserId || !rootRef.current) return;
    const el = rootRef.current.querySelector(
      `[data-user-id="${currentUserId}"]`
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, currentUserId]);

  const toggle = () => {
    setOpen((s) => {
      const next = !s;
      if (next) onOpen?.();
      else onClose?.();
      return next;
    });
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 p-1 rounded group hover:bg-[#3a3a3a] transition-colors"
      >
        <div className="flex -space-x-2">
          {(users || []).slice(0, maxVisible).map((u) => (
            <div
              key={u.id}
              title={u.name || u.initials}
              className="w-7 h-7 rounded-full border-2 border-[#2c2c2c] flex items-center justify-center text-xs font-semibold text-white"
              style={{ backgroundColor: u.color || "#333" }}
            >
              {u.picture ? (
                <img
                  src={u.picture}
                  alt={u.name || u.initials}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : u.initials ? (
                u.initials[0]
              ) : (
                (u.name || "?").charAt(0)
              )}
            </div>
          ))}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 text-gray-200"
          aria-hidden
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-56 bg-[#1e1e1e] border border-gray-700 rounded shadow-lg z-60">
          <div className="p-2">
            {(users || []).length === 0 && (
              <div className="text-gray-400 text-sm">No users</div>
            )}
            {(users || []).map((u) => {
              const isMe = currentUserId && u.id === currentUserId;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    onUserClick?.(u.id);
                    // close after click
                    setOpen(false);
                    onClose?.();
                  }}
                  className={`flex items-center gap-2 py-1 px-2 hover:bg-[#3a3a3a] rounded cursor-pointer`}
                  data-user-id={u.id}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: u.color || "#333" }}
                  >
                    {u.picture ? (
                      <img
                        src={u.picture}
                        alt={u.name || u.initials}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : u.initials ? (
                      u.initials[0]
                    ) : (
                      (u.name || "?").charAt(0)
                    )}
                  </div>
                  <div className="text-sm text-gray-100">
                    {u.name || u.initials || u.id}{" "}
                    {isMe ? (
                      <span className="text-xs text-gray-400">(You)</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

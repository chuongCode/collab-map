import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(url: string, opts?: Parameters<typeof io>[1]) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(url, opts);
    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [url, JSON.stringify(opts)]);

  return socketRef;
}
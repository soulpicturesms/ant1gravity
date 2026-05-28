import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function useSocket(namespace) {
  const ctx = useContext(SocketContext);
  return ctx?.[namespace] || null;
}

export function SocketProvider({ children }) {
  const socketsRef = useRef({});

  function getSocket(namespace) {
    if (!socketsRef.current[namespace]) {
      socketsRef.current[namespace] = io(`/${namespace}`, {
        path: '/socket.io',
        autoConnect: false,
        transports: ['websocket', 'polling'],
      });
    }
    return socketsRef.current[namespace];
  }

  useEffect(() => {
    return () => {
      for (const s of Object.values(socketsRef.current)) s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ getSocket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useGameSocket(namespace) {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('SocketProvider not found');
  return ctx.getSocket(namespace);
}

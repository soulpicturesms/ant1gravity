// Socket.io is not supported on Vercel serverless.
// Poker uses a REST + polling approach instead.
// This context is kept as a no-op stub so imports don't break.
import React, { createContext, useContext } from 'react';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  return <SocketContext.Provider value={null}>{children}</SocketContext.Provider>;
}

export function useSocket() { return null; }
export function useGameSocket() { return null; }

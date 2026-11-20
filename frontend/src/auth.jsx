import { createContext, useContext, useState } from "react";
import * as api from "./api.js";

const AuthContext = createContext(null);
const KEY = "sua_session";

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  async function signIn(email, password) {
    const result = await api.login(email, password);
    localStorage.setItem(KEY, JSON.stringify(result));
    setSession(result);
    return result.user;
  }

  function signOut() {
    localStorage.removeItem(KEY);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

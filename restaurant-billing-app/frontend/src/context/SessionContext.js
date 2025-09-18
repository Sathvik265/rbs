import React, { createContext, useContext, useState, useEffect } from "react";

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [currentSession, setCurrentSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on load
    const savedSession = localStorage.getItem("current_session");
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setCurrentSession(session);
      } catch (error) {
        console.error("Error parsing saved session:", error);
        localStorage.removeItem("current_session");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (sessionData) => {
    setCurrentSession(sessionData);
    localStorage.setItem("current_session", JSON.stringify(sessionData));
  };

  const logout = () => {
    setCurrentSession(null);
    localStorage.removeItem("current_session");
  };

  const updateSession = (updates) => {
    if (currentSession) {
      const updatedSession = { ...currentSession, ...updates };
      setCurrentSession(updatedSession);
      localStorage.setItem("current_session", JSON.stringify(updatedSession));
    }
  };

  const value = {
    currentSession,
    isLoading,
    login,
    logout,
    updateSession,
    isLoggedIn: !!currentSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

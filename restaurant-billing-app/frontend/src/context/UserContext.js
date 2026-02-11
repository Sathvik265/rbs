import React, { createContext, useContext, useState, useEffect } from "react";

// Create the context
const UserContext = createContext();

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

// Provider component
export const UserProvider = ({ children }) => {
  const [userInitials, setUserInitials] = useState(
    () => localStorage.getItem("userInitials") || "CLK",
  );
  const [track, setTrack] = useState(() => localStorage.getItem("track") || "");
  const [billingDate, setBillingDate] = useState(
    () => localStorage.getItem("billingDate") || null,
  );
  const [sessionId, setSessionId] = useState(
    () => localStorage.getItem("sessionId") || null,
  );

  // Sync with localStorage whenever values change
  useEffect(() => {
    console.log("UserContext: userInitials changed to:", userInitials);
    if (userInitials) {
      localStorage.setItem("userInitials", userInitials);
    } else {
      localStorage.removeItem("userInitials");
    }
  }, [userInitials]);

  useEffect(() => {
    if (track) {
      localStorage.setItem("track", track);
    } else {
      localStorage.removeItem("track");
    }
  }, [track]);

  useEffect(() => {
    if (billingDate) {
      localStorage.setItem("billingDate", billingDate);
    } else {
      localStorage.removeItem("billingDate");
    }
  }, [billingDate]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem("sessionId", sessionId);
    } else {
      localStorage.removeItem("sessionId");
    }
  }, [sessionId]);

  const value = {
    userInitials,
    setUserInitials,
    track,
    setTrack,
    billingDate,
    setBillingDate,
    sessionId,
    setSessionId,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

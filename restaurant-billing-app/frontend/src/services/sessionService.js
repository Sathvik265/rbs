import api from "./apiService";

export const sessionService = {
  async login(clerkInitials, shiftCode, sessionDate, terminalId = null) {
    const response = await api.post("/shifts/login", {
      clerkInitials: clerkInitials.toUpperCase(),
      shiftCode,
      sessionDate,
      terminalId,
    });
    return response.session;
  },

  async endShift(sessionId) {
    const response = await api.put(`/shifts/${sessionId}/end`);
    return response;
  },

  async getSession(sessionId) {
    const response = await api.get(`/shifts/${sessionId}`);
    return response.session;
  },

  async getSessionSummary(sessionId) {
    const response = await api.get(`/shifts/${sessionId}/summary`);
    return response.summary;
  },

  async getAllSessions(limit = 50, offset = 0) {
    const response = await api.get(`/shifts?limit=${limit}&offset=${offset}`);
    return response.sessions;
  },

  async getSessionsByDateRange(startDate, endDate) {
    const response = await api.get(
      `/shifts/date-range/search?startDate=${startDate}&endDate=${endDate}`
    );
    return response.sessions;
  },
};

// Helper functions for session management
export const checkSession = () => {
  const savedSession = localStorage.getItem("current_session");
  if (savedSession) {
    try {
      return JSON.parse(savedSession);
    } catch (error) {
      console.error("Error parsing saved session:", error);
      localStorage.removeItem("current_session");
    }
  }
  return null;
};

export const saveSession = (session) => {
  localStorage.setItem("current_session", JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem("current_session");
};

export const isAdminMode = () => {
  return localStorage.getItem("admin_mode") === "true";
};

export const setAdminMode = (isAdmin) => {
  if (isAdmin) {
    localStorage.setItem("admin_mode", "true");
  } else {
    localStorage.removeItem("admin_mode");
  }
};

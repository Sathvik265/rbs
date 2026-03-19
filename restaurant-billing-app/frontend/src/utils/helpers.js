// Shared utility functions and constants for the Restaurant Billing System

export const BACKEND_URL = "http://127.0.0.1:8000";
export const API = `${BACKEND_URL}/api`;

// Toast notification system
export const toast = {
  success: (message) => alert(message),
  error: (message) => alert(message),
};

// Safe utility functions
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return defaultValue;
      current = current[key];
    }
    return current === undefined ? defaultValue : current;
  } catch (e) {
    return defaultValue;
  }
};

export const safeArray = (arr, defaultValue = []) => {
  return Array.isArray(arr) ? arr : defaultValue;
};

export const safeObject = (obj, defaultValue = {}) => {
  return obj && typeof obj === "object" && !Array.isArray(obj)
    ? obj
    : defaultValue;
};

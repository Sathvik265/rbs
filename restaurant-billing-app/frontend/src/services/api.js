import axios from "axios";

// FIXED: Updated to use the correct port (8000) instead of 5000
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

if (!process.env.REACT_APP_API_URL) {
  console.warn(
    "REACT_APP_API_URL is not defined. Falling back to http://localhost:8000/api"
  );
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(
      `API Response: ${response.status} ${response.config.url}`,
      response.data
    );
    return response;
  },
  (error) => {
    console.error("API Response Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==================== AUTHENTICATION ====================
export const login = async (staff_code, is_root = false) => {
  const response = await api.post("/auth/login", { staff_code, is_root });
  return response.data;
};

export const logout = async () => {
  const response = await api.post("/auth/transfer");
  return response.data;
};

// ==================== MENU OPERATIONS ====================
export const fetchMenu = async () => {
  const response = await api.get("/menu");
  return response.data;
};

export const addMenuItem = async (menuItem) => {
  const response = await api.post("/menu", menuItem);
  return response.data;
};

export const deleteMenuItem = async (id) => {
  const response = await api.delete(`/menu/${id}`);
  return response.data;
};

export const lookupMenuItem = async (code) => {
  const response = await api.get(`/menu/lookup/${code}`);
  return response.data;
};

// ==================== BILLING OPERATIONS ====================
export const getNextBillNumber = async (bill_date) => {
  const response = await api.get(`/bill/next_number?bill_date=${bill_date}`);
  return response.data;
};

export const createBill = async (billData) => {
  const response = await api.post("/bill", billData);
  return response.data;
};

export const getLastBill = async (table_no, bill_date) => {
  const response = await api.get(
    `/bill/last?table_no=${table_no}&bill_date=${bill_date}`
  );
  return response.data;
};

export const getBillsByDate = async (bill_date) => {
  const response = await api.get(`/bill/by_date?bill_date=${bill_date}`);
  return response.data;
};

// ==================== SHIFT MANAGEMENT ====================
export const getCurrentShifts = async () => {
  const response = await api.get("/shifts/status");
  return response.data;
};

export const closeShift = async (session_id) => {
  const response = await api.post("/shifts/close", { session_id });
  return response.data;
};

export const manualToggleShift = async (shift_id, new_status) => {
  const response = await api.post("/shifts/manual-toggle", {
    shift_id,
    new_status,
  });
  return response.data;
};

// ==================== REPORTS ====================
export const getTimeWiseReport = async (bill_date) => {
  const response = await api.get(`/reports/time-wise?bill_date=${bill_date}`);
  return response.data;
};

export const getItemWiseReport = async (bill_date) => {
  const response = await api.get(`/reports/item-wise?bill_date=${bill_date}`);
  return response.data;
};

export const getShiftWiseReport = async (bill_date) => {
  const response = await api.get(`/reports/shift-wise?bill_date=${bill_date}`);
  return response.data;
};

export const getDateRangeReport = async (startDate, endDate) => {
  const response = await api.get(
    `/reports/date-range?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data;
};

export const getTimeRangeReport = async (date, startTime, endTime) => {
  const response = await api.get(
    `/reports/time-range?date=${date}&startTime=${startTime}&endTime=${endTime}`
  );
  return response.data;
};

export const getItemReport = async (startDate, endDate) => {
  const response = await api.get(
    `/reports/by-item?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data;
};

// ==================== DASHBOARD ====================
export const getTopItems = async () => {
  const response = await api.get("/dashboard/top-items");
  return response.data;
};

// ==================== RECONCILIATION ====================
export const getUnprintedBills = async () => {
  const response = await api.get("/reconciliation/unprinted");
  return response.data;
};

// ==================== SETTINGS ====================
export const getSettings = async () => {
  const response = await api.get("/settings");
  return response.data;
};

export const updateSettings = async (settings) => {
  const response = await api.put("/settings", settings);
  return response.data;
};

// ==================== HEALTH CHECK ====================
export const healthCheck = async () => {
  const response = await api.get("/health");
  return response.data;
};

export default api;

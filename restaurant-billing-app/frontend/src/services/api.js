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
  const response = await api.get(`/bills/by_date?bill_date=${bill_date}`);
  return response.data;
};

// ==================== SHIFT MANAGEMENT ====================
export const getCurrentShifts = async () => {
  const response = await api.get("/shifts/current");
  return response.data;
};

export const closeShift = async (user_id, shift_type) => {
  const response = await api.post("/shifts/close", { user_id, shift_type });
  return response.data;
};

export const reopenShift = async (shiftId, user_id) => {
  const response = await api.post(`/shifts/reopen/${shiftId}`, { user_id });
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

export const getBillsByShift = async (shiftId) => {
  const response = await api.get(`/reports/by-shift?shiftId=${shiftId}`);
  return response.data;
};

export const getItemReport = async (startDate, endDate) => {
  const response = await api.get(
    `/reports/by-item?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data;
};

export const getTimeReport = async (date, startTime, endTime) => {
  const response = await api.get(
    `/reports/by-time?date=${date}&startTime=${startTime}&endTime=${endTime}`
  );
  return response.data;
};

// ==================== ADMIN OPERATIONS ====================
export const getDashboard = async () => {
  const response = await api.get("/admin/dashboard");
  return response.data;
};

export const getSalesReport = async (
  start_date,
  end_date,
  report_type = "daily"
) => {
  const response = await api.get(
    `/admin/reports/sales?start_date=${start_date}&end_date=${end_date}&report_type=${report_type}`
  );
  return response.data;
};

export const getShiftReconciliation = async (date) => {
  const response = await api.get(`/admin/reconciliation/shifts?date=${date}`);
  return response.data;
};

export const submitReconciliation = async (reconciliationData) => {
  const response = await api.post(
    "/admin/reconciliation/submit",
    reconciliationData
  );
  return response.data;
};

export const getReconciliationHistory = async (
  start_date,
  end_date,
  limit = 50
) => {
  let url = `/admin/reconciliation/history?limit=${limit}`;
  if (start_date && end_date) {
    url += `&start_date=${start_date}&end_date=${end_date}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getAnalyticsTrends = async (period = "7d") => {
  const response = await api.get(`/admin/analytics/trends?period=${period}`);
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

// ==================== LEGACY SUPPORT (for backward compatibility) ====================
// DEPRECATED: These functions are kept for backward compatibility but should be updated to use the new API

export const fetchTransactions = async (tableNumber) => {
  // This was likely for fetching bills by table
  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await api.get(
      `/bill/last?table_no=${tableNumber}&bill_date=${today}`
    );
    return [response.data]; // Return as array for compatibility
  } catch (error) {
    if (error.response?.status === 404) {
      return []; // No bills found
    }
    throw error;
  }
};

export const createTransaction = async (transaction) => {
  // This should be mapped to createBill
  return await createBill(transaction);
};

export const fetchInvoicesByTableAndParty = async (
  tableNumber,
  partyNumber
) => {
  // This needs to be implemented based on your specific requirements
  // For now, return empty array
  console.warn(
    "fetchInvoicesByTableAndParty is deprecated and not implemented"
  );
  return [];
};

export const fetchAllInvoices = async () => {
  // This should be mapped to getBillsByDate
  const today = new Date().toISOString().split("T")[0];
  return await getBillsByDate(today);
};

export const createInvoice = async (tableNumber, partyNumber, clerkId) => {
  // This should be mapped to createBill with appropriate data structure
  console.warn("createInvoice is deprecated. Use createBill instead.");
  const billData = {
    header: {
      table_no: tableNumber,
      party_no: partyNumber,
      clerk_initials: clerkId,
      section: "GENERAL",
      track: "DINE_IN",
    },
    item_codes: [],
    quantities: [],
    bill_date: new Date().toISOString().split("T")[0],
  };
  return await createBill(billData);
};

export default api;

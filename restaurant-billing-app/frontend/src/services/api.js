import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

if (!process.env.REACT_APP_API_URL) {
  console.warn('REACT_APP_API_URL is not defined. Falling back to http://localhost:5000');
}

export const fetchTransactions = async (tableNumber) => {
  const response = await axios.get(`${API_URL}/transactions?tableNumber=${tableNumber}`);
  return response.data;
};

export const createTransaction = async (transaction) => {
  const response = await axios.post(`${API_URL}/transactions`, transaction);
  return response.data;
};

// Fetch invoices for a specific table and party
export const fetchInvoicesByTableAndParty = async (tableNumber, partyNumber) => {
    const response = await axios.get(`${API_URL}/invoices/by-table-party`, {
      params: { tableNumber, partyNumber },
    });
    return response.data;
  };
  
  // Fetch all invoices
  export const fetchAllInvoices = async () => {
    const response = await axios.get(`${API_URL}/invoices`);
    return response.data;
  };
  
  // Create an invoice for a specific table and party
  export const createInvoice = async (tableNumber, partyNumber, clerkId) => {
    const response = await axios.post(`${API_URL}/invoices`, {
      tableNumber,
      partyNumber,
      clerkId,
    });
    return response.data;
  };
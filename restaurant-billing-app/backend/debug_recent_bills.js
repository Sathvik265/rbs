const axios = require("axios");

const API_URL = "http://127.0.0.1:8000/api";
const today = new Date().toISOString().split("T")[0];

async function checkRecentBills() {
  try {
    console.log(`Fetching bills for date: ${today}`);
    const response = await axios.get(
      `${API_URL}/billing/bills/date-range/${today}/${today}`
    );
    const bills = response.data;

    console.log(`Found ${bills.length} bills.`);
    bills.forEach((bill) => {
      console.log(
        `ID: ${bill.id}, Bill No: ${bill.bill_number}, Date: ${bill.bill_date}, Track: ${bill.track}, Total: ${bill.grand_total}`
      );
    });
  } catch (error) {
    console.error("Error fetching bills:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }
  }
}

checkRecentBills();

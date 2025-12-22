try {
  const BillingModel = require("./src/models/billingModel");
  console.log("BillingModel loaded successfully");
} catch (err) {
  console.error("Error loading BillingModel:", err);
}

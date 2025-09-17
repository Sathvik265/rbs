import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BillingScreen from './components/BillingScreen';
import ShiftManagement from './components/ShiftManagement';
import AdminDashboard from './components/AdminDashboard';
import InvoiceScreen from './components/InvoiceScreen';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BillingScreen />} />
        <Route path="/shift-management" element={<ShiftManagement />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/invoices" element={<InvoiceScreen />} />
      </Routes>
    </Router>
  );
}

export default App;
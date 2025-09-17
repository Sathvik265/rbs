import React, { useState, useEffect } from 'react';
import ItemEntryForm from './ItemEntryForm';
import { fetchTransactions, createTransaction } from '../services/api';

function BillingScreen() {
  const [transactions, setTransactions] = useState([]);
  const [tableNumber, setTableNumber] = useState(1);

  useEffect(() => {
    loadTransactions();
  }, [tableNumber]);

  const loadTransactions = async () => {
    const data = await fetchTransactions(tableNumber);
    setTransactions(data);
  };

  const handleAddTransaction = async (transaction) => {
    await createTransaction(transaction);
    loadTransactions();
  };

  return (
    <div>
      <h1>Billing Screen</h1>
      <label>
        Table Number:
        <input
          type="number"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />
      </label>
      <ItemEntryForm onAddTransaction={handleAddTransaction} tableNumber={tableNumber} />
      <ul>
        {transactions.map((t) => (
          <li key={t.id}>
            {t.item_name} - {t.quantity} x {t.price} = {t.quantity * t.price}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BillingScreen;
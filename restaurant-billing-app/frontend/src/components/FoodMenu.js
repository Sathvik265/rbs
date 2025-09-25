import React, { useState, useEffect } from "react";
import { fetchMenu } from "../services/api";

function FoodMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetchMenu();
      setMenuItems(response || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching menu items:", err);
      setError("Failed to fetch menu items");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.alpha_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numeric_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="food-menu-container">
        <div className="system-title">Udupi Anand Bhavan — Billing System</div>
        <div className="nav-section">
          <div className="nav-tabs">
            <div className="nav-tab">📋 Billing</div>
            <div className="nav-tab active">🍽️ Food Menu</div>
            <div className="nav-tab">📄 Recent Bills</div>
            <div className="nav-tab">⚙️ Admin</div>
          </div>
        </div>
        <div className="loading-section">
          <div>Loading menu items...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="food-menu-container">
      <div className="system-title">Udupi Anand Bhavan — Billing System</div>

      <div className="nav-section">
        <div className="nav-tabs">
          <div className="nav-tab">📋 Billing</div>
          <div className="nav-tab active">🍽️ Food Menu</div>
          <div className="nav-tab">📄 Recent Bills</div>
          <div className="nav-tab">⚙️ Admin</div>
        </div>
      </div>

      <div className="menu-main-content">
        <div className="menu-left-panel">
          <div className="menu-header">
            <h2>Food Menu</h2>
          </div>

          <div className="search-section">
            <div className="search-group">
              <label>Search Items (Name or Code)</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search items..."
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          <div className="menu-stats">
            <div className="stat-item">
              <span>Total Items: {menuItems.length}</span>
            </div>
            <div className="stat-item">
              <span>Filtered: {filteredItems.length}</span>
            </div>
          </div>

          <div className="menu-table">
            <div className="table-header">
              <span>Code</span>
              <span>Item Name</span>
              <span>Category</span>
              <span>General</span>
              <span>AC</span>
              <span>Fixed</span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="empty-table">
                <div className="empty-message">
                  {searchTerm
                    ? `No items found matching "${searchTerm}"`
                    : "No menu items available"}
                </div>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`table-row ${
                    selectedItem?.id === item.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <span>{item.alpha_code || item.numeric_code}</span>
                  <span>{item.name}</span>
                  <span>{item.category || "General"}</span>
                  <span>₹{(item.price_general || 0).toFixed(2)}</span>
                  <span>₹{(item.price_ac || 0).toFixed(2)}</span>
                  <span>₹{(item.price_fixed || 0).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="menu-right-panel">
          <div className="help-section">
            <div className="help-header">
              <span>🔍</span> Help
            </div>

            <div className="help-content">
              <p>Search for menu items by name or item code.</p>
              <p>Click on an item to view details.</p>

              <div className="keyboard-shortcuts">
                <h4>Keyboard Shortcuts</h4>
                <ul>
                  <li>
                    <strong>F2:</strong> Focus search box
                  </li>
                  <li>
                    <strong>Enter:</strong> Select highlighted item
                  </li>
                  <li>
                    <strong>Esc:</strong> Clear search
                  </li>
                  <li>
                    <strong>Arrow Keys:</strong> Navigate items
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {selectedItem && (
            <div className="item-details-section">
              <h3>Item Details</h3>

              <div className="item-info">
                <div className="info-row">
                  <span>Name:</span>
                  <span>{selectedItem.name}</span>
                </div>
                <div className="info-row">
                  <span>Alpha Code:</span>
                  <span>{selectedItem.alpha_code || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span>Numeric Code:</span>
                  <span>{selectedItem.numeric_code || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span>Category:</span>
                  <span>{selectedItem.category || "General"}</span>
                </div>
                <div className="info-row">
                  <span>Status:</span>
                  <span
                    className={selectedItem.is_active ? "active" : "inactive"}
                  >
                    {selectedItem.is_active ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>

              <div className="pricing-info">
                <h4>Pricing</h4>
                <div className="price-grid">
                  <div className="price-item">
                    <span>General:</span>
                    <span>₹{(selectedItem.price_general || 0).toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span>AC Section:</span>
                    <span>₹{(selectedItem.price_ac || 0).toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span>Fixed Price:</span>
                    <span>₹{(selectedItem.price_fixed || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="menu-actions">
            <button onClick={fetchMenuItems} className="refresh-btn">
              🔄 Refresh Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FoodMenu;

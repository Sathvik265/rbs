import React, { useState, useEffect, useRef } from "react";
import "../styles/ItemEntryForm.css";

const ItemEntryForm = ({ onSearch, searchResults, onSelectItem, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    onSearch(searchQuery);
  }, [searchQuery, onSearch]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults.length > 0 && searchResults[selectedIndex]) {
        onSelectItem(searchResults[selectedIndex]);
      }
    }
  };

  const handleItemClick = (item, index) => {
    setSelectedIndex(index);
    onSelectItem(item);
  };

  return (
    <div className="item-search-overlay">
      <div className="item-search-modal">
        <div className="search-header">
          <h3>Item Search</h3>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        <div className="search-input-section">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to search items..."
            className="search-input"
          />
        </div>

        <div className="search-results">
          {searchQuery.trim() === "" ? (
            <div className="search-help">
              <p>Start typing to search for items</p>
              <p>Search by: Item name, code, or category</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="no-results">
              <p>No items found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="results-list">
              {searchResults.map((item, index) => (
                <div
                  key={item.id}
                  className={`result-item ${
                    index === selectedIndex ? "selected" : ""
                  }`}
                  onClick={() => handleItemClick(item, index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="item-details">
                    <div className="item-code">{item.item_code}</div>
                    <div className="item-name">{item.item_name}</div>
                    <div className="item-category">{item.category}</div>
                  </div>
                  <div className="item-price">₹{item.unit_price}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="search-shortcuts">
          <p>
            <strong>Navigate:</strong> ↑↓ arrows | <strong>Select:</strong>{" "}
            Enter | <strong>Close:</strong> Escape
          </p>
        </div>
      </div>
    </div>
  );
};

export default ItemEntryForm;

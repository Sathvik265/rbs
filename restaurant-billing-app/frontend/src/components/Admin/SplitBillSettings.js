import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Button,
  Loader2,
} from "../ui/UIComponents";

const API = process.env.REACT_APP_API_URL;

export default function SplitBillSettings() {
  // ... imports
  // (Assuming imports remain mostly the same, but adding useState if missing)

  // Inside component:
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState(null); // New state for confirmation
  const [successMsg, setSuccessMsg] = useState(""); // New state for success message

  useEffect(() => {
    fetchItems();
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/items`);
      // Sort items alphabetically
      const sortedItems = response.data.sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      setItems(sortedItems);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch items");
      setLoading(false);
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setSuccessMsg(""); // Clear any previous success msg
  };

  const confirmToggle = async () => {
    if (!selectedItem) return;

    try {
      const newStatus = !selectedItem.is_separate;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id ? { ...i, is_separate: newStatus } : i,
        ),
      );

      await axios.patch(`${API}/items/${selectedItem.id}/separate`, {
        is_separate: newStatus,
      });

      setSuccessMsg(
        `Successfully updated ${selectedItem.name} to ${newStatus ? "Separate" : "Regular"} Bill`,
      );
      setSelectedItem(null); // Close confirmation
    } catch (err) {
      // Revert on error
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id
            ? { ...i, is_separate: selectedItem.is_separate }
            : i,
        ),
      );
      setError("Failed to update item status");
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.alpha_code || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.numeric_code || "").includes(search),
  );

  if (loading) {
    // ... loading spinner (same)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {/* Confirmation Modal Overlay */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">Confirm Change</h3>
            <p className="mb-6 text-gray-700">
              Are you sure you want to mark <strong>{selectedItem.name}</strong>{" "}
              as{" "}
              <strong>
                {selectedItem.is_separate ? "Regular Bill" : "Separate Bill"}
              </strong>
              ?
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
              <Button
                onClick={confirmToggle}
                className={
                  selectedItem.is_separate
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-20 right-8 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50 transition-opacity duration-500">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            {successMsg}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          {/* Header content same */}
          <div className="flex justify-between items-center">
            <CardTitle>Split Bill Settings</CardTitle>
            <div className="relative w-64">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-2 top-2.5 h-4 w-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500 mb-4">
            Click an item to toggle its "Separate Bill" status. You will be
            asked to confirm.
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                  item.is_separate
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <div className="text-xs text-gray-500 flex gap-2">
                    {item.alpha_code && <span>Code: {item.alpha_code}</span>}
                    <span>₹{item.price_general}</span>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                    item.is_separate
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {item.is_separate && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 text-white"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-8">
                No items found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Button,
  Label,
  Loader2,
} from "./ui/UIComponents";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/Table";
import { updateMenuItem } from "../services/api";
import { API, toast, safeGet, safeArray } from "../utils/helpers";

export default function FoodMenu({ mode }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    alpha_code: "",
    numeric_code: "",
    price_fixed: "",
    price_general: "",
    price_ac: "",
    category: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/menu`);
      setItems(safeArray(res.data));
    } catch (e) {
      console.error("Menu load error:", e);
      toast.error("Failed to load menu");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const [editingItem, setEditingItem] = useState(null);
  const saveEditedItem = async () => {
    if (!editingItem) return;
    try {
      const payload = {
        name: editingItem.name,
        alpha_code: editingItem.alpha_code,
        numeric_code: editingItem.numeric_code,
        price_fixed: editingItem.price_fixed,
        price_general: editingItem.price_general,
        price_ac: editingItem.price_ac,
        category: editingItem.category,
      };
      await updateMenuItem(editingItem.id, payload);
      toast.success("Item updated");
      setEditingItem(null);
      load();
    } catch (e) {
      console.error("Failed to update item:", e);
      let userMessage = "Failed to update item";
      if (e?.response) {
        try {
          const status = e.response.status;
          const data = e.response.data;
          userMessage =
            (data && data.detail) ||
            (data && JSON.stringify(data)) ||
            `${e.message} (status ${status})`;
        } catch (inner) {
          userMessage = e.message;
        }
      } else {
        userMessage = e.message || userMessage;
      }
      toast.error(userMessage);
    }
  };

  const renderEditModal = () => {
    if (!editingItem) return null;

    const overlayStyle = {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2147483647,
      padding: 12,
    };

    const cardStyle = {
      maxWidth: 560,
      width: "100%",
      zIndex: 2147483648,
    };

    const modal = (
      <div style={overlayStyle} aria-modal="true" role="dialog">
        <Card style={cardStyle}>
          <CardHeader>
            <CardTitle>Edit Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <Label>Name</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Alpha Code</Label>
                <Input
                  value={editingItem.alpha_code}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      alpha_code: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Numeric Code</Label>
                <Input
                  value={editingItem.numeric_code}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      numeric_code: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Fixed Price</Label>
                <Input
                  type="number"
                  value={editingItem.price_fixed}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      price_fixed: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>General Price</Label>
                <Input
                  type="number"
                  value={editingItem.price_general}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      price_general: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>AC Price</Label>
                <Input
                  type="number"
                  value={editingItem.price_ac}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      price_ac: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={editingItem.category}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, category: e.target.value })
                  }
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={saveEditedItem}>Save</Button>
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );

    return ReactDOM.createPortal(modal, document.body);
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async () => {
    if (!newItem.name || (!newItem.alpha_code && !newItem.numeric_code)) {
      toast.error("Please provide item name and at least one code");
      return;
    }

    try {
      await axios.post(`${API}/menu`, {
        ...newItem,
        price_fixed: parseFloat(newItem.price_fixed) || 0,
        price_general: parseFloat(newItem.price_general) || 0,
        price_ac: parseFloat(newItem.price_ac) || 0,
        category: JSON.stringify({
          name: newItem.category,
          qty: Number(newItem.quantity) || 1,
        }),
      });

      toast.success("Item added successfully");
      setNewItem({
        name: "",
        alpha_code: "",
        numeric_code: "",
        price_fixed: "",
        price_general: "",
        price_ac: "",
        category: "",
        quantity: "",
      });
      load();
    } catch (e) {
      console.error("Add item error:", e);
      toast.error(safeGet(e, "response.data.detail", "Failed to add item"));
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      await axios.delete(`${API}/menu/${itemId}`);
      toast.success("Item deleted successfully");
      load();
    } catch (e) {
      console.error("Delete item error:", e);
      toast.error(safeGet(e, "response.data.detail", "Failed to delete item"));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Loader2 size={24} className="mb-2" />
          <span>Loading menu...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Food Menu ({items.length} items)</CardTitle>
      </CardHeader>
      <CardContent>
        {mode === "admin-full" && (
          <div className="grid grid-cols-7 gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
            <Input
              name="name"
              placeholder="Item Name"
              value={newItem.name}
              onChange={handleNewItemChange}
            />
            <Input
              name="alpha_code"
              placeholder="Alpha Code"
              value={newItem.alpha_code}
              onChange={handleNewItemChange}
            />
            <Input
              name="numeric_code"
              placeholder="Numeric Code"
              value={newItem.numeric_code}
              onChange={handleNewItemChange}
            />
            <Input
              name="price_fixed"
              type="number"
              step="0.01"
              placeholder="Fixed Price"
              value={newItem.price_fixed}
              onChange={handleNewItemChange}
            />
            <Input
              name="price_general"
              type="number"
              step="0.01"
              placeholder="General Price"
              value={newItem.price_general}
              onChange={handleNewItemChange}
            />
            <Input
              name="price_ac"
              type="number"
              step="0.01"
              placeholder="AC Price"
              value={newItem.price_ac}
              onChange={handleNewItemChange}
            />
            <Input
              name="category"
              placeholder="Category"
              value={newItem.category}
              onChange={handleNewItemChange}
            />
            <Input
              name="quantity"
              type="number"
              placeholder="Qty (for Category JSON)"
              value={newItem.quantity || ""}
              onChange={handleNewItemChange}
            />
            <Button onClick={handleAddItem} className="col-span-6">
              + Add Item
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No menu items found.{" "}
            {mode === "admin-full" && "Add some items above to get started."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Alpha Code</TableHead>
                <TableHead>Numeric Code</TableHead>
                <TableHead>Fixed Price</TableHead>
                <TableHead>General Price</TableHead>
                <TableHead>AC Price</TableHead>
                <TableHead>Category</TableHead>
                {mode === "admin-full" && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const safeRender = (val, def = "-") => {
                  if (val === null || val === undefined) return def;
                  if (typeof val === "object") {
                    return val.name || val.item_name || JSON.stringify(val);
                  }
                  return val;
                };

                return (
                  <TableRow key={safeGet(item, "id", Math.random())}>
                    <TableCell>
                      {safeRender(safeGet(item, "name"), "N/A")}
                    </TableCell>
                    <TableCell>
                      {safeRender(safeGet(item, "alpha_code"), "-")}
                    </TableCell>
                    <TableCell>
                      {safeRender(safeGet(item, "numeric_code"), "-")}
                    </TableCell>
                    <TableCell>
                      {Number(safeGet(item, "price_fixed", 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {Number(safeGet(item, "price_general", 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {Number(safeGet(item, "price_ac", 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const raw = safeGet(item, "category");
                        if (!raw) return "-";

                        let display = String(raw);

                        if (typeof raw === "object") {
                          if (Array.isArray(raw) && raw.length > 0) {
                            display =
                              raw[0].name || raw[0].item_name || display;
                          } else if (!Array.isArray(raw)) {
                            display = raw.name || raw.item_name || display;
                          }
                        } else if (typeof raw === "string") {
                          try {
                            if (
                              raw.trim().startsWith("[") ||
                              raw.trim().startsWith("{")
                            ) {
                              const parsed = JSON.parse(raw);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                display =
                                  parsed[0].name ||
                                  parsed[0].item_name ||
                                  display;
                              } else if (parsed && typeof parsed === "object") {
                                display =
                                  parsed.name || parsed.item_name || display;
                              }
                            }
                          } catch (e) {
                            const match = raw.match(
                              /["']name["']\s*:\s*["']([^"']+)["']/i,
                            );
                            if (match && match[1]) display = match[1];
                          }
                        }

                        if (
                          display.startsWith("[") &&
                          display.includes("name")
                        ) {
                          const match = display.match(
                            /["']name["']\s*:\s*["']([^"']+)["']/i,
                          );
                          if (match && match[1]) display = match[1];
                        }

                        return display;
                      })()}
                    </TableCell>
                    {mode === "admin-full" && (
                      <TableCell>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingItem({
                                id: safeGet(item, "id"),
                                name: safeGet(item, "name", ""),
                                alpha_code: safeGet(item, "alpha_code", ""),
                                numeric_code: safeGet(item, "numeric_code", ""),
                                price_fixed: safeGet(item, "price_fixed", 0),
                                price_general: safeGet(
                                  item,
                                  "price_general",
                                  0,
                                ),
                                price_ac: safeGet(item, "price_ac", 0),
                                category: safeGet(item, "category", ""),
                              });
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDeleteItem(safeGet(item, "id"))
                            }
                          >
                            X
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {renderEditModal()}
      </CardContent>
    </Card>
  );
}

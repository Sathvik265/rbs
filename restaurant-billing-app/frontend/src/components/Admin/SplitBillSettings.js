import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Input,
    Loader2,
} from "../ui/UIComponents";
import { API, toast, safeArray, safeGet } from "../../utils/helpers";

export default function SplitBillSettings() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const loadItems = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/menu`);
            setItems(safeArray(res.data));
        } catch (e) {
            console.error("Failed to load items:", e);
            toast.error("Failed to load items");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const toggleSeparate = async (item) => {
        const newStatus = !item.is_separate;
        try {
            // Optimistic update
            setItems((prev) =>
                prev.map((i) =>
                    i.id === item.id ? { ...i, is_separate: newStatus } : i
                )
            );

            await axios.patch(`${API}/items/${item.id}/separate`, {
                is_separate: newStatus,
            });
            toast.success(`${item.name} ${newStatus ? "added to" : "removed from"} Split Bill`);
        } catch (e) {
            console.error("Failed to update item:", e);
            toast.error("Failed to update item status");
            // Revert optimistic update
            setItems((prev) =>
                prev.map((i) =>
                    i.id === item.id ? { ...i, is_separate: !newStatus } : i
                )
            );
        }
    };

    const filteredItems = items.filter((item) =>
        safeGet(item, "name", "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Split Bill Settings</CardTitle>
                <p className="text-sm text-gray-500">
                    Select items that should always appear on a separate bill when "Split Bill" mode is active.
                </p>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <Input
                        placeholder="Search items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <Loader2 size={24} className="mb-2" />
                        <p>Loading items...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors flex items-center justify-between ${item.is_separate
                                        ? "bg-green-50 border-green-200"
                                        : "bg-white hover:bg-gray-50"
                                    }`}
                                onClick={() => toggleSeparate(item)}
                            >
                                <span className="font-medium">{item.name}</span>
                                <div
                                    className={`w-6 h-6 rounded-full border flex items-center justify-center ${item.is_separate
                                            ? "bg-green-500 border-green-500 text-white"
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
                                            className="w-4 h-4"
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
                )}
            </CardContent>
        </Card>
    );
}

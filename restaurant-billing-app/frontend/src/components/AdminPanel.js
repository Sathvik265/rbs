import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Button,
  Loader2,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
} from "./ui/UIComponents";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/Table";
import api from "../services/api";
import {
  TimeRangeReport,
  DateRangeReport,
  ShiftReport,
  ItemReport,
} from "./Reports";
import { API, toast, safeGet, safeArray, safeObject } from "../utils/helpers";

// ================== RECONCILIATION ==================

function EnhancedReconciliation({ sessionId, mode }) {
  const [unprintedBills, setUnprintedBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);
  const [detailsCache, setDetailsCache] = useState({});

  const loadRunningBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reconciliation/running`, {
        headers: { Authorization: "admin" },
      });
      setUnprintedBills(safeArray(res.data));
    } catch (e) {
      console.error("Failed to load running bills:", e);
      toast.error("Failed to load running bills");
      setUnprintedBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode && mode.includes("admin")) {
      loadRunningBills();
    }
  }, [mode, loadRunningBills]);

  if (!mode || !mode.includes("admin")) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Admin access required</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliation - Unprinted Bills</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={loadRunningBills} variant="outline" size="sm">
            Refresh List
          </Button>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 size={24} className="mb-2" />
              <p>Loading unprinted bills...</p>
            </div>
          ) : unprintedBills.length > 0 ? (
            <div className="space-y-2">
              {unprintedBills.map((row) => {
                const key = `${row.table_no}-${row.party_no}`;
                const isExpanded = expandedKey === key;
                const details = detailsCache[key];
                return (
                  <div
                    key={key}
                    className="p-3 border rounded-md bg-white shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          Table {row.table_no} - Party {row.party_no}
                        </div>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(row.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            Items: {row.items_count}
                          </div>
                          <div className="font-bold">
                            ₹{Number(row.total_amount || 0).toFixed(2)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (isExpanded) {
                              setExpandedKey(null);
                              return;
                            }
                            setExpandedKey(key);
                            if (!details) {
                              try {
                                const res = await api.get(
                                  `/billing/orders/table/${row.table_no}/party/${row.party_no}`,
                                );
                                setDetailsCache((prev) => ({
                                  ...prev,
                                  [key]: safeArray(res.data),
                                }));
                              } catch (err) {
                                console.error(
                                  "Failed to load orders for",
                                  key,
                                  err,
                                );
                                toast.error("Failed to load bill details");
                                setDetailsCache((prev) => ({
                                  ...prev,
                                  [key]: [],
                                }));
                              }
                            }
                          }}
                        >
                          {isExpanded ? "Hide" : "Details"}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3">
                        {!details ? (
                          <div className="text-sm text-gray-500">
                            Loading...
                          </div>
                        ) : details.length === 0 ? (
                          <div className="text-sm text-gray-500">No items</div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead>Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {details.map((d, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{d.item_name}</TableCell>
                                  <TableCell>{d.quantity}</TableCell>
                                  <TableCell>
                                    {Number(d.unit_price || 0).toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    {Number(d.line_total || 0).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No unprinted bills found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ================== TOP ITEMS DASHBOARD ==================

function TopItemsDashboard({ sessionId }) {
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTopItems = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const res = await axios.get(`${API}/dashboard/top-items`, {
        headers: { Authorization: "admin" },
      });
      setTopItems(safeArray(res.data));
    } catch (e) {
      console.error("Failed to load top items:", e);
      toast.error("Failed to load top items");
      setTopItems([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadTopItems();
    const interval = setInterval(loadTopItems, 300000);
    return () => clearInterval(interval);
  }, [loadTopItems]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Best-Selling Items Today</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 size={24} className="mb-2" />
            <p>Loading top items...</p>
          </div>
        ) : topItems.length > 0 ? (
          <div className="space-y-3">
            {topItems.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{item.item_name}</h4>
                </div>
                <div className="text-right">
                  <p className="font-bold">{item.total_quantity} sold</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No sales data available for today
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ================== SETTINGS EDITOR ==================

function SettingsEditor({ settings, onChange }) {
  const [form, setForm] = useState(safeObject(settings));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(safeObject(settings));
  }, [settings]);

  const save = async () => {
    setLoading(true);
    try {
      const res = await axios.put(`${API}/settings`, form);
      if (onChange) {
        onChange(res.data);
      }
      toast.success("Settings saved");
    } catch (e) {
      console.error("Settings save error:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to save settings"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Hotel Name</TableCell>
              <TableCell>
                <Input
                  value={safeGet(form, "hotel_name", "")}
                  onChange={(e) =>
                    setForm({ ...form, hotel_name: e.target.value })
                  }
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Phone</TableCell>
              <TableCell>
                <Input
                  value={safeGet(form, "phone", "")}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>GSTIN</TableCell>
              <TableCell>
                <Input
                  value={safeGet(form, "gstin", "")}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Address</TableCell>
              <TableCell>
                <Textarea
                  rows={2}
                  value={safeGet(form, "address", "")}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div className="mt-4">
          <Button onClick={save} disabled={loading} className="w-full">
            {loading ? <Loader2 size={16} className="mr-2" /> : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ================== ENHANCED ADMIN PANEL ==================

export default function EnhancedAdminPanel({ mode, sessionId }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState("dashboard");
  const [reportsInnerTab, setReportsInnerTab] = useState("time-range");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/settings`);
      setSettings(safeObject(res.data));
    } catch (e) {
      console.error("Failed to load settings:", e);
      toast.error("Failed to load settings");
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "admin-full") {
      loadSettings();
    }
  }, [mode]);

  const isAdmin = mode && mode.includes("admin");

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <Tabs value={adminActiveTab} onValueChange={setAdminActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="space-y-6">
            <TopItemsDashboard sessionId={sessionId} />
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
            <Tabs value={reportsInnerTab} onValueChange={setReportsInnerTab}>
              <TabsList>
                <TabsTrigger value="time-range">Time Range</TabsTrigger>
                <TabsTrigger value="date-range">Date Range</TabsTrigger>
                <TabsTrigger value="shift-report">Shift Report</TabsTrigger>
                <TabsTrigger value="item-report">Item Report</TabsTrigger>
              </TabsList>

              <TabsContent value="time-range">
                <TimeRangeReport sessionId={sessionId} />
              </TabsContent>

              <TabsContent value="date-range">
                <DateRangeReport sessionId={sessionId} />
              </TabsContent>

              <TabsContent value="shift-report">
                <ShiftReport sessionId={sessionId} />
              </TabsContent>

              <TabsContent value="item-report">
                <ItemReport sessionId={sessionId} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="reconciliation">
          <EnhancedReconciliation sessionId={sessionId} mode={mode} />
        </TabsContent>

        <TabsContent value="settings">
          {loading ? (
            <Card>
              <CardContent className="text-center py-8">
                <Loader2 size={24} className="mb-2" />
                <span>Loading settings...</span>
              </CardContent>
            </Card>
          ) : (
            <SettingsEditor settings={settings} onChange={setSettings} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

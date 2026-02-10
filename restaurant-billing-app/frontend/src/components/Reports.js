import React, { useState, useEffect } from "react";
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
import { API, toast, safeGet, safeArray } from "../utils/helpers";

export function TimeRangeReport({ sessionId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "21:00",
  });

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/reports/time-range`, {
        params: {
          date: filters.date,
          startTime: filters.startTime,
          endTime: filters.endTime,
        },
        headers: { Authorization: "admin" },
      });
      setReport(res.data);
      toast.success("Time range report generated successfully");
    } catch (e) {
      console.error("Failed to generate time range report:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to generate report"),
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Range Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={filters.startTime}
                onChange={(e) =>
                  setFilters({ ...filters, startTime: e.target.value })
                }
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={filters.endTime}
                onChange={(e) =>
                  setFilters({ ...filters, endTime: e.target.value })
                }
              />
            </div>
          </div>

          <Button onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 size={16} className="mr-2" /> : null}
            Generate Report
          </Button>

          {report && (
            <div className="mt-6 space-y-4">
              {report.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.bill_number}</TableCell>
                        <TableCell>{bill.table_no}</TableCell>
                        <TableCell>
                          {Number(bill.grand_total).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(bill.created_at).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No bills found for the selected time range
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DateRangeReport({ sessionId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/reports/date-range`, {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
        headers: { Authorization: "admin" },
      });
      setReport(res.data);
      toast.success("Date range report generated successfully");
    } catch (e) {
      console.error("Failed to generate date range report:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to generate report"),
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date Range Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <Button onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 size={16} className="mr-2" /> : null}
            Generate Report
          </Button>

          {report && (
            <div className="mt-6 space-y-4">
              {report.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.bill_number}</TableCell>
                        <TableCell>
                          {new Date(bill.bill_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{bill.table_no}</TableCell>
                        <TableCell>
                          {Number(bill.grand_total).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No bills found for the selected date range
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ShiftReport({ sessionId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split("T")[0],
    shiftName: "`",
  });

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/reports/by-shift`, {
        params: {
          date: filters.date,
          shift_name: filters.shiftName,
        },
        headers: { Authorization: "admin" },
      });
      setReport(res.data);
      toast.success("Shift report generated successfully");
    } catch (e) {
      console.error("Failed to generate shift report:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to generate report"),
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Shift</Label>
              <Input
                type="text"
                value={filters.shiftName}
                onChange={(e) =>
                  setFilters({ ...filters, shiftName: e.target.value })
                }
                placeholder="`, ``, RBS1, RBS2"
              />
            </div>
          </div>

          <Button onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 size={16} className="mr-2" /> : null}
            Generate Report
          </Button>

          {report && (
            <div className="mt-6 space-y-4">
              {report.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.bill_number}</TableCell>
                        <TableCell>{bill.table_no}</TableCell>
                        <TableCell>
                          {Number(bill.grand_total).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(bill.created_at).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No bills found for the selected shift
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ItemReport({ sessionId }) {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemNames, setItemNames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dropdownsLoaded, setDropdownsLoaded] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    item_name: "",
    category: "",
  });

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [namesRes, categoriesRes] = await Promise.all([
          axios.get(`${API}/items/names/all`),
          axios.get(`${API}/items/categories/all`),
        ]);
        setItemNames(safeArray(namesRes.data));
        setCategories(safeArray(categoriesRes.data));
        setDropdownsLoaded(true);
      } catch (e) {
        console.error("Failed to fetch dropdown data:", e);
        setDropdownsLoaded(false);
      }
    };
    fetchDropdownData();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      if (filters.item_name) params.item_name = filters.item_name;
      if (filters.category) params.category = filters.category;

      const res = await axios.get(`${API}/reports/by-item`, {
        params,
        headers: { Authorization: "admin" },
      });
      setReport(safeArray(res.data));
      toast.success("Item report generated successfully");
    } catch (e) {
      console.error("Failed to generate item report:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to generate report"),
      );
      setReport([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Item Sales Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Item Name (optional)</Label>
              {dropdownsLoaded && itemNames.length > 0 ? (
                <select
                  className="w-full p-2 border rounded"
                  value={filters.item_name}
                  onChange={(e) =>
                    setFilters({ ...filters, item_name: e.target.value })
                  }
                >
                  <option value="">All Items</option>
                  {itemNames.map((name, index) => (
                    <option key={index} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type="text"
                  placeholder="Type item name..."
                  value={filters.item_name}
                  onChange={(e) =>
                    setFilters({ ...filters, item_name: e.target.value })
                  }
                />
              )}
            </div>
            <div>
              <Label>Category (optional)</Label>
              {dropdownsLoaded && categories.length > 0 ? (
                <select
                  className="w-full p-2 border rounded"
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
                >
                  <option value="">All Categories</option>
                  {categories.map((cat, index) => (
                    <option key={index} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type="text"
                  placeholder="Type category..."
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
                />
              )}
            </div>
          </div>

          <Button onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 size={16} className="mr-2" /> : null}
            Generate Report
          </Button>

          {report.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-4">Item Sales Breakdown</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.itemName}
                      </TableCell>
                      <TableCell>{item.category || "N/A"}</TableCell>
                      <TableCell>{item.shiftName}</TableCell>
                      <TableCell className="font-bold">
                        {item.totalQuantity}
                      </TableCell>
                      <TableCell>₹{item.totalAmount?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {report.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No data available for the selected date range
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

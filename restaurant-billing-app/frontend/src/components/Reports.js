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

const printReport = (title, columns, data) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow popups to print reports");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: monospace; padding: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .text-right { text-align: right; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              ${columns.map((col) => `<th>${col.header}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) => `
              <tr>
                ${columns
                  .map(
                    (col) =>
                      `<td class="${col.align === "right" ? "text-right" : ""}">
                    ${col.accessor(row)}
                  </td>`,
                  )
                  .join("")}
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

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

  const handlePrint = () => {
    if (!report || report.length === 0) return;
    printReport(
      `Time Range Report (${filters.date} ${filters.startTime} - ${filters.endTime})`,
      [
        { header: "Bill No", accessor: (r) => r.bill_number },
        { header: "Table", accessor: (r) => r.table_no },
        {
          header: "Amount",
          accessor: (r) => Number(r.grand_total).toFixed(2),
          align: "right",
        },
        {
          header: "Time",
          accessor: (r) => new Date(r.created_at).toLocaleTimeString(),
        },
      ],
      report,
    );
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

          <div className="flex gap-2">
            <Button onClick={generateReport} disabled={loading}>
              {loading ? <Loader2 size={16} className="mr-2" /> : null}
              Generate Report
            </Button>
            {report && report.length > 0 && (
              <Button onClick={handlePrint} variant="outline">
                Print Report
              </Button>
            )}
          </div>

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

  const handlePrint = () => {
    if (!report || report.length === 0) return;
    printReport(
      `Date Range Report (${filters.startDate} - ${filters.endDate})`,
      [
        { header: "Bill No", accessor: (r) => r.bill_number },
        {
          header: "Date",
          accessor: (r) => new Date(r.bill_date).toLocaleDateString(),
        },
        { header: "Table", accessor: (r) => r.table_no },
        {
          header: "Amount",
          accessor: (r) => Number(r.grand_total).toFixed(2),
          align: "right",
        },
      ],
      report,
    );
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

          <div className="flex gap-2">
            <Button onClick={generateReport} disabled={loading}>
              {loading ? <Loader2 size={16} className="mr-2" /> : null}
              Generate Report
            </Button>
            {report && report.length > 0 && (
              <Button onClick={handlePrint} variant="outline">
                Print Report
              </Button>
            )}
          </div>

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

  const handlePrint = () => {
    if (!report || report.length === 0) return;
    printReport(
      `Shift Report (${filters.date} - ${filters.shiftName})`,
      [
        { header: "Bill No", accessor: (r) => r.bill_number },
        { header: "Table", accessor: (r) => r.table_no },
        {
          header: "Amount",
          accessor: (r) => Number(r.grand_total).toFixed(2),
          align: "right",
        },
        {
          header: "Time",
          accessor: (r) => new Date(r.created_at).toLocaleTimeString(),
        },
      ],
      report,
    );
  };

  const handlePrintSummary = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/reports/shift-summary`, {
        params: { date: filters.date },
        headers: { Authorization: "admin" },
      });
      const data = res.data;
      if (!data || data.length === 0) {
        toast.error("No shift data found for this date");
        return;
      }

      const summaryData = [...data];
      const totalAmount = data.reduce((s, r) => s + Number(r.amount), 0);
      const totalGst = data.reduce((s, r) => s + Number(r.gst_amount), 0);
      const grandTotal = data.reduce((s, r) => s + Number(r.total_amount), 0);

      summaryData.push({
        shift_name: "** TOTAL **",
        amount: totalAmount,
        gst_amount: totalGst,
        total_amount: grandTotal,
        date: "",
      });

      printReport(
        `Shift Summary Report (${filters.date})`,
        [
          {
            header: "Date",
            accessor: (r) =>
              r.date ? new Date(r.date).toLocaleDateString() : "",
          },
          { header: "Shift Name", accessor: (r) => r.shift_name },
          {
            header: "Amount Rs",
            accessor: (r) => Number(r.amount).toFixed(2),
            align: "right",
          },
          {
            header: "GST Rs",
            accessor: (r) => Number(r.gst_amount).toFixed(2),
            align: "right",
          },
          {
            header: "Total Rs",
            accessor: (r) => Number(r.total_amount).toFixed(2),
            align: "right",
          },
        ],
        summaryData,
      );
    } catch (e) {
      console.error("Failed to generate summary report:", e);
      toast.error("Failed to generate summary report");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDetailed = async () => {
    if (!filters.shiftName || filters.shiftName.trim() === "") {
      toast.error(
        "Please enter a valid shift name (e.g. RBS1) for detailed report",
      );
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`${API}/reports/shift-detailed`, {
        params: { date: filters.date, shift_name: filters.shiftName },
        headers: { Authorization: "admin" },
      });
      const data = res.data;
      if (!data || data.length === 0) {
        toast.error("No items found for this shift");
        return;
      }

      const detailedData = [...data];
      const totalQty = data.reduce((s, r) => s + Number(r.total_quantity), 0);
      const totalAmount = data.reduce((s, r) => s + Number(r.total_amount), 0);
      const totalGst = data.reduce((s, r) => s + Number(r.gst_amount), 0);
      const finalTotal = data.reduce((s, r) => s + Number(r.final_total), 0);

      detailedData.push({
        item_code: "",
        item_name: "** TOTAL **",
        category: "",
        total_quantity: totalQty,
        total_amount: totalAmount,
        gst_amount: totalGst,
        final_total: finalTotal,
      });

      printReport(
        `Detailed Shift Report (${filters.date} - ${filters.shiftName})`,
        [
          { header: "Code", accessor: (r) => r.item_code },
          { header: "Item Desc", accessor: (r) => r.item_name },
          { header: "Category", accessor: (r) => r.category || "" },
          { header: "Qty", accessor: (r) => r.total_quantity },
          {
            header: "Amount Rs",
            accessor: (r) => Number(r.total_amount).toFixed(2),
            align: "right",
          },
          {
            header: "GST Rs",
            accessor: (r) => Number(r.gst_amount).toFixed(2),
            align: "right",
          },
          {
            header: "Total Rs",
            accessor: (r) => Number(r.final_total).toFixed(2),
            align: "right",
          },
        ],
        detailedData,
      );
    } catch (e) {
      console.error("Failed to generate detailed report:", e);
      toast.error("Failed to generate detailed report");
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
                placeholder="\`, \`\`, RBS1, RBS2"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={generateReport} disabled={loading}>
              {loading ? <Loader2 size={16} className="mr-2" /> : null}
              Generate List
            </Button>
            {report && report.length > 0 && (
              <Button onClick={handlePrint} variant="outline">
                Print Bill List
              </Button>
            )}
            <Button
              onClick={handlePrintSummary}
              variant="outline"
              disabled={loading}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
            >
              {loading ? <Loader2 size={16} className="mr-2" /> : null}
              Summary Report
            </Button>
            <Button
              onClick={handlePrintDetailed}
              variant="outline"
              disabled={loading}
              className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
            >
              {loading ? <Loader2 size={16} className="mr-2" /> : null}
              Detailed Report
            </Button>
          </div>

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

  const handlePrint = () => {
    if (!report || report.length === 0) return;
    printReport(
      `Item Sales Report (${filters.startDate} - ${filters.endDate})`,
      [
        { header: "Item Name", accessor: (r) => r.itemName },
        { header: "Category", accessor: (r) => r.category || "N/A" },
        { header: "Shift", accessor: (r) => r.shiftName },
        { header: "Quantity", accessor: (r) => r.totalQuantity },
        {
          header: "Amount",
          accessor: (r) => "₹" + Number(r.totalAmount).toFixed(2),
          align: "right",
        },
      ],
      report,
    );
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

          <div className="flex gap-2">
            <Button onClick={generateReport} disabled={loading}>
              {loading ? <Loader2 size={16} className="mr-2" /> : null}
              Generate Report
            </Button>
            {report.length > 0 && (
              <Button onClick={handlePrint} variant="outline">
                Print Report
              </Button>
            )}
          </div>

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

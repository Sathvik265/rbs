import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
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
import { getShiftStatus, reopenShift, closeShift } from "../services/api";
import { API, toast, safeGet, safeArray } from "../utils/helpers";

export default function ShiftTab({
  mode,
  sessionId,
  currentShift,
  currentDate,
}) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isAdmin = mode && mode.includes("admin");
  const isClerk = mode === "clerk";

  const loadShiftStatus = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const res = await getShiftStatus();
      setShifts(safeArray(res));
    } catch (e) {
      console.error("Failed to load shift status:", e);
      toast.error("Failed to load shift status");
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadShiftStatus();
      const interval = setInterval(loadShiftStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, loadShiftStatus]);

  const handleCloseShift = async () => {
    if (!sessionId) return;

    try {
      const res = await axios.post(`${API}/shifts/close`, {
        session_id: sessionId,
      });

      toast.success(`Shift ${res.data.shift_name} closed successfully`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error("Failed to close shift:", e);
      toast.error(safeGet(e, "response.data.detail", "Failed to close shift"));
    }

    setShowCloseConfirm(false);
  };

  const handleShiftAction = async (shiftId, currentStatus) => {
    if (!isAdmin) return;

    try {
      if (currentStatus === "OPEN") {
        await closeShift(shiftId);
        toast.success(`Shift closed successfully`);
      } else {
        await reopenShift(shiftId);
        toast.success(`Shift reopened successfully`);
      }
      loadShiftStatus();
    } catch (e) {
      console.error("Failed to perform shift action:", e);
      toast.error(
        safeGet(e, "response.data.detail", "Failed to perform shift action"),
      );
    }
  };

  const ClerkView = () => (
    <div className="text-center p-6 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">
        Current Shift: {currentShift || "Unknown"}
      </h3>
      <p className="text-sm text-blue-700 mb-4">
        You are currently working in shift {currentShift} on {currentDate}
      </p>
      <Button
        variant="destructive"
        onClick={() => setShowCloseConfirm(true)}
        className="w-full max-w-xs"
      >
        Close Shift & Logout
      </Button>
    </div>
  );

  const AdminView = () => (
    <>
      {loading ? (
        <div className="text-center py-8">
          <Loader2 size={24} className="mb-2" />
          <p>Loading shift status...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={loadShiftStatus} variant="outline" size="sm">
              Refresh Status
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.session_id}>
                  <TableCell className="font-medium">
                    {shift.shift_name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        shift.status === "OPEN"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {shift.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {shift.start_time
                      ? new Date(shift.start_time).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {shift.end_time
                      ? new Date(shift.end_time).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={
                        shift.status === "OPEN" ? "destructive" : "success"
                      }
                      onClick={() =>
                        handleShiftAction(shift.session_id, shift.status)
                      }
                    >
                      {shift.status === "OPEN" ? "Close" : "Re-open"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {shifts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No shifts found for this date
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Shift Management</CardTitle>
        </CardHeader>
        <CardContent>
          {isAdmin && (
            <div className="mb-4">
              <Button
                onClick={() => setShowCloseConfirm(true)}
                variant="destructive"
                size="sm"
              >
                Close Current Shift & Logout
              </Button>
            </div>
          )}
          {isClerk ? (
            <ClerkView />
          ) : isAdmin ? (
            <AdminView />
          ) : (
            <p>Access Denied</p>
          )}
        </CardContent>
      </Card>

      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle>Close Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Are you sure you want to close this shift? This will log you
                out.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCloseShift}
                  className="flex-1"
                >
                  Yes, Close Shift
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

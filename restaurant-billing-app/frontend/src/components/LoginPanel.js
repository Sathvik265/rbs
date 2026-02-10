import React, { useState, useEffect, useRef } from "react";
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
import { API, toast, safeGet, safeArray } from "../utils/helpers";

export function LoginPanel({ onLogin, onStartAdminVerification }) {
  const [credential, setCredential] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [track, setTrack] = useState("");
  const credentialInputRef = useRef(null);

  // --- Shift status check state ---
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [isShiftClosed, setIsShiftClosed] = useState(false);

  // Fetch all sessions on mount to know which shifts are open/closed
  useEffect(() => {
    const fetchSessions = async () => {
      setSessionsLoading(true);
      try {
        const res = await axios.get(`${API}/shifts/sessions`);
        setSessions(safeArray(res.data));
      } catch (e) {
        console.error("Failed to fetch sessions for shift check:", e);
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, []);

  // Whenever track changes, check if that shift is closed
  useEffect(() => {
    if (!track || sessions.length === 0) {
      setIsShiftClosed(false);
      return;
    }
    const validTracks = ["`", "``", "RBS1", "RBS2"];
    if (!validTracks.includes(track)) {
      setIsShiftClosed(false);
      return;
    }

    // Check by shift_name only — session_date in DB is the original creation
    // date, not today's date, so date comparison would always fail.
    const matchingSessions = sessions.filter((s) => s.shift_name === track);

    if (matchingSessions.length === 0) {
      // No session exists for this shift yet — allow login (backend will create one)
      setIsShiftClosed(false);
      return;
    }

    const hasOpen = matchingSessions.some(
      (s) => s.status && s.status.toUpperCase() === "OPEN",
    );
    const hasClosed = matchingSessions.some(
      (s) => s.status && s.status.toUpperCase() === "CLOSED",
    );

    // Block login only if all sessions for this shift are CLOSED (none OPEN)
    setIsShiftClosed(hasClosed && !hasOpen);
  }, [track, date, sessions]);

  useEffect(() => {
    if (credentialInputRef.current) {
      credentialInputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!isShiftClosed) {
        submit(event.shiftKey);
      }
    }
  };

  const submit = async (isRoot = false) => {
    if (!date || !track) {
      toast.error("Please enter date and track.");
      return;
    }

    const validTracks = ["`", "``", "RBS1", "RBS2"];
    if (!validTracks.includes(track)) {
      toast.error("Invalid track. Valid tracks are '`', '``', 'RBS1', 'RBS2'.");
      return;
    }

    if (isShiftClosed) {
      toast.error(
        "This shift is closed and cannot be accessed. An admin must re-open it from Shift Management first.",
      );
      return;
    }

    if (credential.toUpperCase() === "SHI" && isRoot) {
      if (onStartAdminVerification) {
        onStartAdminVerification(date, track);
      }
      return;
    }

    try {
      const res = await axios.post(`${API}/auth/login`, {
        staff_code: credential,
        is_root: isRoot,
        date: date,
        track: track,
      });

      if (onLogin) {
        onLogin(
          res.data.mode,
          date,
          track,
          res.data.session_id,
          credential.toUpperCase(),
        );
      }

      toast.success(
        res.data.mode && res.data.mode.includes("admin")
          ? `Logged in as ${res.data.mode}`
          : "Clerk mode",
      );
    } catch (e) {
      if (onLogin) {
        onLogin("none", null, null, null, null);
      }
      toast.error(safeGet(e, "response.data.detail", "Invalid login"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Staff Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label>Credential</Label>
              <Input
                ref={credentialInputRef}
                placeholder="Enter credential"
                className="col-span-2"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label>Date</Label>
              <Input
                type="date"
                className="col-span-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label>Track</Label>
              <Input
                type="text"
                placeholder="Enter track"
                className="col-span-2"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {isShiftClosed && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: "0.375rem",
                  padding: "0.75rem 1rem",
                  color: "#991b1b",
                  fontSize: "0.875rem",
                }}
              >
                <strong>⚠ This shift is closed</strong> and cannot be accessed.
                <br />
                An admin must log in with another open shift, re-open this shift
                from the Shifts section, log out, and then log in with this
                shift.
              </div>
            )}

            {sessionsLoading && (
              <div className="text-xs text-gray-500 text-center">
                Checking shift status...
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => submit(false)}
                className="w-full"
                disabled={isShiftClosed}
              >
                Login
              </Button>
            </div>
            <div className="text-xs text-gray-600 text-center">
              Hint: Use 'CLK' for clerk, 'SHI' for admin. Track: '`', '``',
              'RBS1', 'RBS2'
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminVerificationScreen({ onVerificationComplete }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        if (onVerificationComplete) {
          onVerificationComplete("admin-full");
        }
      }
    };

    const timer = setTimeout(() => {
      if (onVerificationComplete) {
        onVerificationComplete("admin-limited");
      }
    }, 5000);

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onVerificationComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50">
      <Card>
        <CardContent className="text-center p-8">
          <div className="animate-spin inline-block mb-4">
            <Loader2 size={32} />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            Verifying Admin Access...
          </h2>
          <p className="text-sm text-gray-600">
            Press Alt+A now for full access
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

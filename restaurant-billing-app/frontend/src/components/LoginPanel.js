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
  // Helper to get local YYYY-MM-DD
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getLocalDate());
  const [track, setTrack] = useState("");
  const credentialInputRef = useRef(null);
  const trackInputRef = useRef(null);

  // --- Shift status check state ---
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [isShiftClosed, setIsShiftClosed] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [password, setPassword] = useState("");
  const passwordInputRef = useRef(null);

  // Fetch all sessions on mount to know which shifts are open/closed
  useEffect(() => {
    // Update date every minute to handle overnight open app
    const dateInterval = setInterval(() => {
      setDate(getLocalDate());
    }, 60000);

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

    return () => clearInterval(dateInterval);
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
    if (credentialInputRef.current && !showPwd) {
      credentialInputRef.current.focus();
    } else if (showPwd && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [showPwd]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!isShiftClosed) {
        submit();
      }
    } else if (event.key === "Escape" && showPwd) {
      setShowPwd(false);
      setPassword("");
      setTimeout(() => credentialInputRef.current?.focus(), 0);
    }
  };

  const submit = async () => {
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

    // Admin Access Flow
    if (credential.toUpperCase() === "SHI") {
      if (!showPwd) {
        setShowPwd(true);
        return;
      }

      if (password === "SHRIDAR") {
        if (onLogin) onLogin("admin-restricted", date, track, null, "SHI");
        return;
      } else if (password === "SHRIDAR123") {
        if (onLogin) onLogin("admin-full", date, track, null, "SHI");
        return;
      } else {
        toast.error("Invalid Admin Password");
        return;
      }
    }

    // Normal Login Flow
    try {
      const res = await axios.post(`${API}/auth/login`, {
        staff_code: credential,
        is_root: false,
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
    <div className="flex items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Staff Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!showPwd ? (
              <>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <Label>Credential</Label>
                  <Input
                    ref={credentialInputRef}
                    placeholder="Enter credential"
                    className="col-span-2"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Tab" && !e.shiftKey) {
                        e.preventDefault();
                        trackInputRef.current?.focus();
                      } else {
                        handleKeyDown(e);
                      }
                    }}
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
                    readOnly
                    tabIndex={-1}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <Label>Track</Label>
                  <Input
                    ref={trackInputRef}
                    type="text"
                    placeholder="Enter track"
                    className="col-span-2"
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-4 items-center">
                <Label>Password</Label>
                <Input
                  ref={passwordInputRef}
                  type="password"
                  placeholder="Enter Admin Password"
                  className="col-span-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            )}

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

            <div className="flex gap-2 flex-col">
              <Button
                onClick={() => submit()}
                className="w-full"
                disabled={isShiftClosed}
              >
                {showPwd ? "Verify" : "Login"}
              </Button>
              {showPwd && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowPwd(false);
                    setPassword("");
                  }}
                >
                  Back
                </Button>
              )}
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

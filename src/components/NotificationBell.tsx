"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cloudApi } from "@/lib/cloud-api";

type SecurityState = "healthy" | "warning" | "alert";

export function NotificationBell() {
  const [state, setState] = useState<SecurityState>("healthy");
  const [message, setMessage] = useState("Cloud security healthy");

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await fetch(cloudApi("/api/admin"));
        if (!active) return;
        if (response.status === 401 || response.status === 403) {
          setState("alert");
          setMessage("Admin authentication required");
        } else if (!response.ok) {
          setState("warning");
          setMessage("Security service temporarily unavailable");
        } else {
          setState("healthy");
          setMessage("Cloud security healthy");
        }
      } catch {
        if (active) {
          setState("warning");
          setMessage("Unable to reach cloud security service");
        }
      }
    };
    void check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const color = state === "alert" ? "text-red-400" : state === "warning" ? "text-yellow-400" : "text-green-400";
  return <button type="button" title={message} aria-label={message} className={`relative rounded p-2 hover:bg-zinc-800 ${color}`}><Bell className="h-5 w-5" /><span className={`absolute right-1 top-1 h-2 w-2 rounded-full ${state === "alert" ? "bg-red-400" : state === "warning" ? "bg-yellow-400" : "bg-green-400"}`} /></button>;
}

import React from "react";
import Card from "./primitives/Card";
import { health } from "../services/api";

export default function HealthOverlay({ open, onReady, maxWaitMs = 120000 }) {
  const [status, setStatus] = React.useState("Checking server…");
  const [error, setError] = React.useState("");
  const [attempt, setAttempt] = React.useState(0);
  const [startedAt] = React.useState(Date.now());

  React.useEffect(() => {
    if (!open) return;
    let abort = false;
    let timer;

    const poll = async () => {
      try {
        const json = await health();
        if (json?.ok) {
          setStatus("Backend is ready ✅"); setError(""); onReady?.(json); return;
        }
        setStatus("Waiting for backend…"); setError("");
      } catch (e) {
        setStatus("Waiting for backend…"); setError("");
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed > maxWaitMs) setStatus("Taking longer than usual… still checking");
      const delay = Math.min(2000 * Math.pow(1.5, attempt), 10000);
      timer = setTimeout(() => { if (!abort) { setAttempt(x => x + 1); poll(); } }, delay);
    };

    poll();
    return () => { abort = true; if (timer) clearTimeout(timer); };
  }, [open]); // eslint-disable-line

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-white/85 backdrop-blur-sm flex items-center justify-center z-50">
      <Card title="Starting backend…">
        <div className="w-[420px]">
          <div className="text-sm">{status}</div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="text-xs text-gray-500 mt-2">This can take a minute the first time.</div>
        </div>
      </Card>
    </div>
  );
}

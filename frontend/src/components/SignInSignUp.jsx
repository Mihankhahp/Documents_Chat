import React, { useState } from "react";
import Card from "./primitives/Card";
import Button from "./primitives/Button";
import Labeled from "./primitives/Labeled";
import { signup, signin } from "../services/api";

export default function SignInSignUp({ userId, setUserId }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const disabled = !username || !password;

  const doSignup = async () => {
    setBusy(true); setError("");
    try { const res = await signup({ username, password }); setUserId(res.user_id); }
    catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };
  const doSignin = async () => {
    setBusy(true); setError("");
    try { const res = await signin({ username, password }); setUserId(res.user_id); }
    catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };

  return (
    <Card title="Sign in / Sign up">
      <div className="space-y-2">
        <Labeled label="Username">
          <input className="w-full border rounded-lg px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Labeled>
        <Labeled label="Password">
          <input className="w-full border rounded-lg px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Labeled>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-2">
          <Button onClick={doSignin} disabled={busy || disabled}>Sign in</Button>
          <Button onClick={doSignup} disabled={busy || disabled} variant="secondary">Sign up</Button>
        </div>
      </div>
    </Card>
  );
}

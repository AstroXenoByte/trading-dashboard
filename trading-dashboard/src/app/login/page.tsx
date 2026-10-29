"use client";
import { useActionState } from "react";
import { login } from "../actions";
export default function Login() {
  const [s, act, pending] = useActionState(login, undefined);
  return (<form action={act} className="card" style={{ maxWidth: 360, margin: "80px auto", display: "grid", gap: 10 }}>
    <h1>Sign in</h1>
    <label>Username<input name="u" autoComplete="username" required style={{ width: "100%" }} /></label>
    <label>Password<input name="p" type="password" autoComplete="current-password" required style={{ width: "100%" }} /></label>
    {s?.error && <p role="alert" className="bad">{s.error}</p>}
    <button disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button></form>);
}

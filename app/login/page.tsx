"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError, csrfCookie, errorMessage } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await csrfCookie();
      await api("/api/login", { method: "POST", body: { email: form.get("email"), password: form.get("password") } });
      router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError && e.status === 422 ? e.field("email") : errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm border-2 border-tinta bg-kertas">
        <div className="border-b-2 border-tinta px-5 py-3">
          <p className="label-mono">Kelas 3D · Bengkel Koding</p>
          <h1 className="text-xl font-bold">Masuk koordinator</h1>
        </div>
        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="label-mono">Email</span>
            <input name="email" type="email" required autoComplete="email" className="mt-1 w-full border-2 border-tinta bg-white px-2 py-1.5" />
          </label>
          <label className="block">
            <span className="label-mono">Password</span>
            <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full border-2 border-tinta bg-white px-2 py-1.5" />
          </label>
          {error && <p className="border-l-4 border-marun pl-2 text-sm text-marun">{error}</p>}
          <button type="submit" disabled={busy} className="tombol w-full">
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
        </div>
        <p className="border-t-2 border-dashed border-tinta px-5 py-3 text-sm text-pudar">
          Peserta dan ketua kelas tidak memakai password. Jalankan <code className="font-mono text-tinta">kelas3d buka</code> di terminal laptopmu.
        </p>
      </form>
    </main>
  );
}

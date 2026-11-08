"use client";

import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import type { Presence } from "@/lib/types";

// Peserta minta bantuan; avatarnya memakai klip angkat_tangan sampai tangannya diturunkan atau ditandai selesai.
export function AngkatTangan({ slug, saya }: { slug: string; saya: Presence | undefined }) {
  const [buka, setBuka] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const help = saya?.help_request;

  async function jalankan(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setBuka(false);
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  }

  function angkat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get("note") || null;
    void jalankan(() => api("/api/help-requests", { method: "POST", body: { classroom: slug, note } }));
  }

  return (
    <div className="relative flex items-center gap-2">
      {help ? (
        <>
          <span className="tag text-oranye">{help.status === "ditangani" ? "Sedang dibantu" : "Tangan terangkat"}</span>
          <button
            type="button"
            className="tombol"
            disabled={busy}
            onClick={() => jalankan(() => api(`/api/help-requests/${help.id}`, { method: "PATCH", body: { status: "selesai" } }))}
          >
            Turunkan tangan
          </button>
        </>
      ) : (
        <button type="button" className="tombol" onClick={() => setBuka((v) => !v)}>
          ✋ Angkat tangan
        </button>
      )}
      {buka && !help && (
        <form onSubmit={angkat} className="absolute right-0 top-full z-20 mt-2 w-72 space-y-2 border-2 border-tinta bg-kertas p-3 shadow-[4px_4px_0_#1c1917]">
          <label className="block">
            <span className="label-mono">Butuh bantuan soal apa? (boleh kosong)</span>
            <input name="note" maxLength={255} className="mt-1 w-full border-2 border-tinta bg-white px-2 py-1 text-sm" placeholder="Error migrate" />
          </label>
          <button type="submit" className="tombol" disabled={busy}>
            Angkat tangan
          </button>
        </form>
      )}
      {error && <span className="text-sm text-marun">{error}</span>}
    </div>
  );
}

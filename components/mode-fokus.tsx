"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { Presence } from "@/lib/types";

// Peserta menandai dirinya sedang fokus: avatarnya memakai headphone, dan pengumuman ditahan sampai selesai.
export function ModeFokus({ saya, ditahan, onBerubah }: { saya: Presence | undefined; ditahan: number; onBerubah: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hadir = !!saya && saya.state !== "keluar";
  const fokus = hadir && saya.focus;

  async function ubah() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/focus", { method: "PUT", body: { on: !fokus } });
      onBerubah();
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-2">
      {fokus && ditahan > 0 && <span className="label-mono">{ditahan} pengumuman ditahan</span>}
      <button
        type="button"
        className={`tombol ${fokus ? "bg-tinta text-kertas" : ""}`}
        aria-pressed={fokus}
        disabled={busy || !hadir}
        title={hadir ? "Avatarmu memakai headphone, dan pengumuman ditahan sampai fokus selesai" : "Mode fokus cuma bisa dipakai saat kamu di kelas"}
        onClick={ubah}
      >
        🎧 {fokus ? "Selesai fokus" : "Fokus"}
      </button>
      {error && <span className="text-sm text-marun">{error}</span>}
    </div>
  );
}

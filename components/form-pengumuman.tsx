"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatClock } from "@/lib/presence";
import type { Classroom } from "@/lib/types";
import type { Pengumuman } from "@/lib/use-rooms";

// Koordinator mengirim pengumuman ke satu kelas atau semua kelas, dan melihat yang terkirim hari ini.
export function FormPengumuman({ classrooms, riwayat, onTutup }: { classrooms: Classroom[]; riwayat: Pengumuman[]; onTutup: () => void }) {
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      await api("/api/announcements", {
        method: "POST",
        body: { message: data.get("message"), classroom: data.get("classroom") || null },
      });
      form.reset();
      setPesan("Terkirim. Muncul di web dan jadi notifikasi di laptop peserta.");
    } catch (e) {
      setPesan(e instanceof ApiError && e.status === 422 ? e.field("message") : errorMessage(e));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={kirim} className="absolute right-3 top-full z-20 mt-2 w-80 space-y-2 border-2 border-tinta bg-kertas p-3 shadow-[4px_4px_0_#1c1917]">
      <p className="label-mono">Kirim pengumuman</p>
      <textarea name="message" required maxLength={255} rows={3} className="w-full border-2 border-tinta bg-white px-2 py-1 text-sm" placeholder="Istirahat 15 menit, lanjut jam 10.30" />
      <select name="classroom" className="w-full border-2 border-tinta bg-white px-2 py-1 text-sm">
        <option value="">Semua kelas</option>
        {classrooms.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      {pesan && <p className="text-sm text-pudar">{pesan}</p>}
      <div className="flex gap-2">
        <button type="submit" className="tombol" disabled={busy}>
          Kirim
        </button>
        <button type="button" className="tombol" onClick={onTutup}>
          Tutup
        </button>
      </div>
      {riwayat.length > 0 && (
        <div className="border-t-2 border-tinta pt-2">
          <p className="label-mono">Terkirim hari ini</p>
          <ul className="mt-1 max-h-48 space-y-1.5 overflow-auto">
            {riwayat.map((a) => (
              <li key={a.id} className="text-sm">
                <p>{a.message}</p>
                <p className="label-mono">
                  {formatClock(a.created_at)} WIB · {a.for_all ? "semua kelas" : (classrooms.find((c) => c.slug === a.classroom)?.name ?? a.classroom)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

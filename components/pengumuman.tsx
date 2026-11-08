"use client";

import { formatClock } from "@/lib/presence";
import type { Pengumuman } from "@/lib/use-rooms";

// Pengumuman hari ini yang belum ditutup, di atas ruangan 3D: diambil dari API saat halaman dibuka,
// lalu ditambah yang datang lewat AnnouncementSent.
export function DaftarPengumuman({ list, onTutup }: { list: Pengumuman[]; onTutup: (id: number) => void }) {
  if (!list.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-2 px-3">
      {list.slice(0, 3).map((a) => (
        <div key={a.id} className="pointer-events-auto flex w-full max-w-xl items-start gap-3 border-2 border-tinta bg-kertas px-3 py-2 shadow-[4px_4px_0_#1c1917]">
          <span className="tag mt-0.5 text-oranye">Pengumuman</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">{a.message}</p>
            <p className="label-mono mt-0.5">
              {a.from} · {formatClock(a.created_at)} WIB{a.for_all ? " · semua kelas" : ""}
            </p>
          </div>
          <button type="button" className="font-mono text-sm" onClick={() => onTutup(a.id)} aria-label="Tutup pengumuman">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

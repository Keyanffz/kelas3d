"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/presence";
import type { ActivityRecap, Classroom, Member } from "@/lib/types";

const tanggal = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

// Rekap aktivitas satu peserta: per hari (di kelas dan istirahat), per project, dan per bahasa.
export function Rekap({ classrooms }: { classrooms: Classroom[] }) {
  const [slug, setSlug] = useState(classrooms[0]?.slug ?? "");
  const [members, setMembers] = useState<Member[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [dari, setDari] = useState(() => tanggal(new Date(Date.now() - 6 * 86400000)));
  const [sampai, setSampai] = useState(() => tanggal(new Date()));
  const [rekap, setRekap] = useState<ActivityRecap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api<{ data: Member[] }>(`/api/classrooms/${slug}/members`).then(
      (r) => setMembers(r.data),
      (e: unknown) => setError(errorMessage(e)),
    );
  }, [slug]);

  useEffect(() => {
    if (!userId) return;
    api<{ data: ActivityRecap }>(`/api/users/${userId}/activity?from=${dari}&to=${sampai}`).then(
      (r) => {
        setRekap(r.data);
        setError(null);
      },
      (e: unknown) => setError(errorMessage(e)),
    );
  }, [userId, dari, sampai]);

  const input = "border-2 border-tinta bg-white px-2 py-1 text-sm";
  const nama = members.find((m) => m.user.id === userId)?.user.name;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label>
          <span className="label-mono block">Kelas</span>
          <select
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setUserId(null);
              setRekap(null);
            }}
            className={input}
          >
            {classrooms.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label-mono block">Peserta</span>
          <select value={userId ?? ""} onChange={(e) => setUserId(Number(e.target.value) || null)} className={`${input} min-w-48`}>
            <option value="">Pilih peserta</option>
            {members.map((m) => (
              <option key={m.id} value={m.user.id}>
                {m.seat_code ? `${m.seat_code.toUpperCase()} · ` : ""}
                {m.user.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label-mono block">Dari</span>
          <input type="date" value={dari} max={sampai} onChange={(e) => setDari(e.target.value)} className={input} />
        </label>
        <label>
          <span className="label-mono block">Sampai</span>
          <input type="date" value={sampai} min={dari} onChange={(e) => setSampai(e.target.value)} className={input} />
        </label>
      </div>
      {error && <p className="text-sm text-marun">{error}</p>}

      {!userId && <p className="text-sm text-pudar">Pilih peserta untuk melihat rekapnya.</p>}
      {userId && rekap && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Kartu judul={`Per hari · ${nama ?? ""}`}>
            <p className="mb-2 flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 bg-hijau" /> Di kelas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 bg-kuning" /> Istirahat
              </span>
            </p>
            {rekap.per_day.length === 0 ? <Kosong /> : <PerHari data={rekap.per_day} />}
          </Kartu>
          <Kartu judul="Per project (waktu di kelas)">
            <Batang data={rekap.per_project.map((p) => ({ nama: p.project, detik: p.seconds }))} />
          </Kartu>
          <Kartu judul="Per bahasa (waktu di kelas)">
            <Batang data={rekap.per_language.map((p) => ({ nama: p.language, detik: p.seconds }))} />
          </Kartu>
        </div>
      )}
    </div>
  );
}

function Kartu({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="border-2 border-tinta bg-kertas p-3">
      <p className="label-mono mb-2">{judul}</p>
      {children}
    </section>
  );
}

const Kosong = () => <p className="text-sm text-pudar">Belum ada data di rentang ini.</p>;

function PerHari({ data }: { data: ActivityRecap["per_day"] }) {
  const max = Math.max(...data.map((d) => d.di_kelas + d.istirahat), 1);
  return (
    <ul className="space-y-1.5">
      {data.map((d) => (
        <li key={d.date} className="grid grid-cols-[4.5rem_1fr] items-center gap-2 text-xs" title={`Di kelas ${formatDuration(d.di_kelas)} · istirahat ${formatDuration(d.istirahat)}`}>
          <span className="font-mono text-pudar">{new Date(`${d.date}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "numeric" })}</span>
          <div>
            {/* Dua segmen bertumpuk dengan celah 2 px; durasinya ditulis di bawah karena kuning kurang kontras di latar terang. */}
            <div className="flex h-3 gap-[2px]">
              <span className={`bg-hijau ${d.istirahat ? "" : "rounded-r-[4px]"}`} style={{ width: `${(d.di_kelas / max) * 100}%` }} />
              <span className="rounded-r-[4px] bg-kuning" style={{ width: `${(d.istirahat / max) * 100}%` }} />
            </div>
            <span className="font-mono text-[11px]">
              {formatDuration(d.di_kelas)} · {formatDuration(d.istirahat)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Batang({ data }: { data: { nama: string; detik: number }[] }) {
  if (data.length === 0) return <Kosong />;
  const max = Math.max(...data.map((d) => d.detik), 1);
  return (
    <ul className="space-y-1.5">
      {data.map((d) => (
        <li key={d.nama} className="text-xs" title={`${d.nama}: ${formatDuration(d.detik)}`}>
          <div className="flex justify-between gap-2">
            <span className="truncate">{d.nama}</span>
            <span className="font-mono">{formatDuration(d.detik)}</span>
          </div>
          <div className="mt-0.5 h-2.5 rounded-r-[4px] bg-tinta" style={{ width: `${(d.detik / max) * 100}%` }} />
        </li>
      ))}
    </ul>
  );
}

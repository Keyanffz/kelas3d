"use client";

import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/presence";
import { hariIniJakarta, kelompokkan, type Kelompok, type Progress, type Rentang, type SlotAksesoris } from "@/lib/progres";
import type { Me } from "@/lib/types";
import { useMe, useSetMe } from "../session";

const RENTANG: { id: Rentang; nama: string; ini: string }[] = [
  { id: "hari", nama: "Hari", ini: "Hari ini" },
  { id: "minggu", nama: "Minggu", ini: "Minggu ini" },
  { id: "bulan", nama: "Bulan", ini: "Bulan ini" },
];

// Progres pribadi: cuma pemilik akun yang bisa membukanya, tanpa perbandingan dengan teman.
export default function ProgresPage() {
  const [data, setData] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rentang, setRentang] = useState<Rentang>("hari");

  useEffect(() => {
    api<{ data: Progress }>("/api/progress").then(
      (r) => setData(r.data),
      (e: unknown) => setError(errorMessage(e)),
    );
  }, []);

  const kelompok = useMemo(() => (data ? kelompokkan(data.days, rentang, hariIniJakarta()) : []), [data, rentang]);
  const ini = kelompok.at(-1);
  const pilihan = RENTANG.find((r) => r.id === rentang);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <div>
        <h1 className="text-lg font-bold">Progresku</h1>
        <p className="text-sm text-pudar">Cuma kamu yang bisa melihat halaman ini. Jam ngoding = ngoding, vibe coding, dan ngolah data.</p>
      </div>
      {error && <p className="text-sm text-marun">{error}</p>}
      {!data && !error && <p className="label-mono">Memuat…</p>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Angka judul={`Aktif · ${pilihan?.ini}`} isi={formatDuration(ini?.aktif ?? 0)} />
            <Angka judul={`Ngoding · ${pilihan?.ini}`} isi={formatDuration(ini?.ngoding ?? 0)} />
            <Angka judul="Streak hari aktif" isi={`${data.streak.sekarang} hari`} catatan={`Terbaik ${data.streak.terbaik} hari`} />
          </div>

          <section className="border-2 border-tinta bg-kertas p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 bg-tinta" /> Ngoding
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 bg-hijau" /> Aktif lainnya
                </span>
              </p>
              <div className="flex border-2 border-tinta font-mono text-xs uppercase tracking-wider">
                {RENTANG.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={rentang === r.id}
                    onClick={() => setRentang(r.id)}
                    className={`px-3 py-1.5 ${rentang === r.id ? "bg-tinta text-kertas" : "hover:bg-kertas-tua"}`}
                  >
                    {r.nama}
                  </button>
                ))}
              </div>
            </div>
            <Grafik data={kelompok} />
          </section>
          <p className="text-xs text-pudar">Hari tanpa jadwal kelas tidak memutus streak. Waktu istirahat tidak dihitung aktif.</p>

          <Level data={data} onBerubah={setData} />
        </>
      )}
    </main>
  );
}

function Angka({ judul, isi, catatan }: { judul: string; isi: string; catatan?: string }) {
  return (
    <section className="border-2 border-tinta bg-kertas p-3">
      <p className="label-mono">{judul}</p>
      <p className="font-mono text-2xl font-bold">{isi}</p>
      {catatan && <p className="text-xs text-pudar">{catatan}</p>}
    </section>
  );
}

function Grafik({ data }: { data: Kelompok[] }) {
  const max = Math.max(...data.map((d) => d.aktif), 1);
  return (
    <ul className="space-y-1.5">
      {data.map((d) => (
        <li key={d.kunci} className="grid grid-cols-[7.5rem_1fr] items-center gap-2 text-xs" title={`Aktif ${formatDuration(d.aktif)} · ngoding ${formatDuration(d.ngoding)}`}>
          <span className="truncate font-mono text-pudar">{d.label}</span>
          <div>
            <div className="flex h-3 gap-[2px]">
              {d.ngoding > 0 && <span className="bg-tinta" style={{ width: `${(d.ngoding / max) * 100}%` }} />}
              {d.aktif > d.ngoding && <span className="bg-hijau" style={{ width: `${((d.aktif - d.ngoding) / max) * 100}%` }} />}
            </div>
            <span className="font-mono text-[11px]">{d.aktif ? `${formatDuration(d.aktif)} · ngoding ${formatDuration(d.ngoding)}` : "—"}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

const SLOT: { id: SlotAksesoris; nama: string }[] = [
  { id: "topi", nama: "Topi" },
  { id: "meja", nama: "Item meja" },
];

// XP = menit ngoding ditambah 20 per hari streak terbaik. Tiap level membuka aksesoris baru.
function Level({ data, onBerubah }: { data: Progress; onBerubah: (p: Progress) => void }) {
  const me = useMe();
  const setMe = useSetMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { total, level, dari, ke } = data.xp;
  const persen = Math.min(100, ((total - dari) / Math.max(1, ke - dari)) * 100);

  async function pakai(slot: SlotAksesoris, id: string | null) {
    setBusy(true);
    setError(null);
    const dipakai = { ...data.dipakai, [slot]: id };
    try {
      const r = await api<{ data: Omit<Me, "classrooms"> }>("/api/aksesoris", { method: "PUT", body: dipakai });
      setMe({ ...me, ...r.data, classrooms: me.classrooms });
      onBerubah({ ...data, dipakai });
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  }

  return (
    <section className="space-y-3 border-2 border-tinta bg-kertas p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="label-mono">Level {level}</p>
        <p className="font-mono text-xs">
          {total} XP · {ke - total} lagi ke level {level + 1}
        </p>
      </div>
      <div className="h-3 border-2 border-tinta bg-white" role="progressbar" aria-valuemin={dari} aria-valuemax={ke} aria-valuenow={total}>
        <div className="h-full bg-marun" style={{ width: `${persen}%` }} />
      </div>

      {!me.avatar && <p className="text-sm text-pudar">Pilih tampilan avatar dulu sebelum memakai aksesoris.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {SLOT.map((slot) => (
          <div key={slot.id}>
            <p className="label-mono mb-1">{slot.nama}</p>
            <ul className="space-y-1">
              {[null, ...data.aksesoris.filter((a) => a.slot === slot.id)].map((a) => {
                const id = a?.id ?? null;
                const aktif = data.dipakai[slot.id] === id;
                const kunci = a !== null && !a.terbuka;
                return (
                  <li key={id ?? "kosong"}>
                    <button
                      type="button"
                      aria-pressed={aktif}
                      disabled={busy || kunci || !me.avatar}
                      onClick={() => !aktif && pakai(slot.id, id)}
                      className={`flex w-full justify-between border-2 border-tinta px-2 py-1 text-left text-sm disabled:opacity-50 ${aktif ? "bg-tinta text-kertas" : "bg-white hover:bg-kertas-tua"}`}
                    >
                      <span>{a ? a.nama : "Tanpa"}</span>
                      {a && <span className="font-mono text-xs">{kunci ? `🔒 Level ${a.level}` : aktif ? "Dipakai" : ""}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-xs text-pudar">Bentuknya masih sementara. Topi tampil di avatarmu, item meja di sebelah laptop kursimu.</p>
      {error && <p className="text-sm text-marun">{error}</p>}
    </section>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { errorMessage } from "@/lib/api";
import { AVATAR_BAWAAN, rakit } from "@/lib/scene/tampilan";
import type { Avatar } from "@/lib/types";

const Pratinjau = dynamic(() => import("./scene/pratinjau"), { ssr: false, loading: () => <p className="label-mono p-6">Memuat pratinjau…</p> });

const RAMBUT: { id: Avatar["rambut"]; nama: string }[] = [
  { id: "rambut_1", nama: "Pendek belah samping" },
  { id: "rambut_2", nama: "Cepak" },
  { id: "rambut_3", nama: "Panjang berponi" },
  { id: "rambut_4", nama: "Kuncir dua" },
  { id: "rambut_5", nama: "Hijab" },
];

const PALET: Record<keyof Avatar["warna"], string[]> = {
  kulit: ["#f6d2b0", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a21"],
  rambut: ["#1c1c1c", "#2b1b17", "#4a3728", "#6b4423", "#a16207", "#1e3a8a", "#7f1d1d", "#e7e5e4"],
  celana: ["#1f2937", "#374151", "#3f3f46", "#1e3a8a", "#78350f", "#14532d"],
};

// Pemilih tampilan avatar; pratinjaunya memakai avatar 3D yang sama dengan scene.
export function PemilihAvatar({
  awal,
  slug,
  ketua,
  koordinator,
  simpan,
  onBatal,
}: {
  awal: Avatar | null;
  slug: string | null;
  ketua: boolean;
  koordinator: boolean;
  simpan: (a: Avatar) => Promise<void>;
  onBatal?: () => void;
}) {
  const [a, setA] = useState<Avatar>(awal ?? AVATAR_BAWAAN);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hijab = a.rambut === "rambut_5";
  const warna = (k: keyof Avatar["warna"], v: string) => setA({ ...a, warna: { ...a.warna, [k]: v } });

  async function kirim() {
    setBusy(true);
    setError(null);
    try {
      await simpan(a);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1fr_24rem]">
      <div className="relative min-h-[45vh] border-b-2 border-tinta lg:border-b-0 lg:border-r-2">
        <Pratinjau rakitan={rakit(a, { slug, ketua, koordinator })} />
      </div>
      <div className="space-y-5 p-4">
        <Bagian judul="Tipe badan">
          <div className="grid grid-cols-2 gap-2">
            {(["laki", "perempuan"] as const).map((t) => (
              <Pilihan key={t} aktif={a.tipe_badan === t} onClick={() => setA({ ...a, tipe_badan: t })}>
                {t === "laki" ? "Laki-laki" : "Perempuan"}
              </Pilihan>
            ))}
          </div>
        </Bagian>
        <Bagian judul="Rambut">
          <div className="grid grid-cols-2 gap-2">
            {RAMBUT.map((r) => (
              <Pilihan key={r.id} aktif={a.rambut === r.id} onClick={() => setA({ ...a, rambut: r.id })}>
                {r.nama}
              </Pilihan>
            ))}
          </div>
          {hijab && a.tipe_badan === "perempuan" && <p className="mt-1.5 text-xs text-pudar">Dengan hijab, bawahan jadi rok dan warnanya ikut warna bawahan.</p>}
        </Bagian>
        <Warna judul="Warna kulit" nilai={a.warna.kulit} palet={PALET.kulit} onPilih={(v) => warna("kulit", v)} />
        <Warna judul={hijab ? "Warna hijab" : "Warna rambut"} nilai={a.warna.rambut} palet={PALET.rambut} onPilih={(v) => warna("rambut", v)} />
        <Warna judul={hijab && a.tipe_badan === "perempuan" ? "Warna rok" : "Warna celana"} nilai={a.warna.celana} palet={PALET.celana} onPilih={(v) => warna("celana", v)} />
        {error && <p className="border-l-4 border-marun pl-2 text-sm text-marun">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="tombol bg-tinta text-kertas" disabled={busy} onClick={kirim}>
            {busy ? "Menyimpan…" : "Simpan avatar"}
          </button>
          {onBatal && (
            <button type="button" className="tombol" onClick={onBatal}>
              Batal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="label-mono mb-1.5">{judul}</p>
      {children}
    </section>
  );
}

function Pilihan({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={`border-2 border-tinta px-2 py-1.5 text-left text-sm ${aktif ? "bg-tinta text-kertas" : "bg-white hover:bg-kertas-tua"}`}
    >
      {children}
    </button>
  );
}

function Warna({ judul, nilai, palet, onPilih }: { judul: string; nilai: string; palet: string[]; onPilih: (v: string) => void }) {
  return (
    <Bagian judul={judul}>
      <div className="flex flex-wrap items-center gap-1.5">
        {palet.map((w) => (
          <button
            key={w}
            type="button"
            aria-label={w}
            aria-pressed={nilai === w}
            onClick={() => onPilih(w)}
            className={`size-8 border-2 ${nilai === w ? "border-oranye ring-2 ring-oranye" : "border-tinta"}`}
            style={{ backgroundColor: w }}
          />
        ))}
        <label className="flex items-center gap-1.5 border-2 border-tinta bg-white px-1.5 py-1 text-xs" title="Warna lain">
          <input type="color" value={nilai} onChange={(e) => onPilih(e.target.value)} className="size-6 cursor-pointer" />
          <span className="font-mono">{nilai}</span>
        </label>
      </div>
    </Bagian>
  );
}

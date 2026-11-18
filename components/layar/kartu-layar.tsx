"use client";

import { useEffect, useRef, useState } from "react";
import { keteranganLayar, peranLayar, sesiAktif, sisaDetik, STATUS_LAYAR, TAHAP_LAYAR } from "@/lib/layar";
import type { ScreenSession } from "@/lib/types";
import { useLayar } from "./penyedia";

function useDetik(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Kartu lihat layar di pojok kiri bawah semua halaman: status untuk koordinator, persetujuan untuk ketua
// kelas, dan izin untuk mahasiswa, juga share sukarela dari antrean bantuan. Selama layarnya dilihat,
// mahasiswa selalu melihat penanda di atas.
export function KartuLayar({ meId }: { meId: number }) {
  const { sesi, pesan, aksi } = useLayar();
  const dilihat = sesi.filter((s) => s.status === "live" && s.target.id === meId);
  const kartu = sesi.filter((s) => !dilihat.includes(s));

  return (
    <>
      {dilihat.map((s) => (
        <div
          key={s.id}
          role="status"
          className="fixed left-1/2 top-2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-3 border-2 border-tinta bg-marun px-3 py-1.5 text-sm text-kertas shadow-[4px_4px_0_#1c1917]"
        >
          <span className="size-2.5 shrink-0 animate-pulse bg-kertas" />
          <span>
            Layarmu sedang dilihat {s.help_request_id ? "" : "koordinator "}
            <b>{s.viewer.name}</b>
          </span>
          <button type="button" className="tombol bg-kertas text-tinta" onClick={() => aksi(s.id, "stop")}>
            Hentikan
          </button>
        </div>
      ))}
      {(kartu.length > 0 || pesan) && (
        <div className="fixed bottom-4 left-4 z-40 flex w-[24rem] max-w-[calc(100vw-2rem)] flex-col gap-3">
          {pesan && <p className="border-2 border-tinta bg-white px-3 py-2 text-sm text-marun shadow-[4px_4px_0_#1c1917]">{pesan}</p>}
          {kartu.map((s) => (
            <Kartu key={s.id} s={s} meId={meId} />
          ))}
        </div>
      )}
    </>
  );
}

function Kartu({ s, meId }: { s: ScreenSession; meId: number }) {
  const { aksi, izinkan, buang, streams } = useLayar();
  const now = useDetik();
  const [busy, setBusy] = useState(false);
  const [besar, setBesar] = useState(false);
  const peran = peranLayar(s, meId);
  const aktif = sesiAktif(s);
  const menunggu = s.status === "menunggu_ketua" || s.status === "menunggu_mahasiswa";
  const stream = streams.get(s.id);
  // Yang harus menjawab sekarang: ketua kelas atau mahasiswanya.
  const giliran = (peran === "ketua" && s.status === "menunggu_ketua") || (peran === "mahasiswa" && s.status === "menunggu_mahasiswa");

  async function jalankan(fn: () => Promise<unknown>) {
    setBusy(true);
    await fn();
    setBusy(false);
  }

  return (
    <section className={`border-2 border-tinta bg-kertas shadow-[4px_4px_0_#1c1917] ${besar && stream ? "fixed inset-4 z-50 flex flex-col" : ""}`}>
      <div className="border-b-2 border-tinta px-3 py-2">
        <p className="label-mono">
          {s.help_request_id ? "Bantuan" : "Lihat layar"} · {s.classroom}
        </p>
        <h2 className="font-bold leading-tight">
          {peran === "mahasiswa"
            ? s.help_request_id
              ? `Kamu membagikan layar ke ${s.viewer.name}`
              : `${s.viewer.name} minta melihat layarmu`
            : peran === "ketua"
              ? `${s.viewer.name} minta melihat layar ${s.target.name}`
              : `Layar ${s.target.name}`}
        </h2>
      </div>

      <div className={`space-y-2 px-3 py-2 text-sm ${besar && stream ? "flex min-h-0 flex-1 flex-col" : ""}`}>
        {peran === "penonton" && aktif && !s.help_request_id && (
          <ol className="flex gap-1 font-mono text-[10px] uppercase tracking-wide">
            {TAHAP_LAYAR.map((t, i) => {
              const kini = TAHAP_LAYAR.indexOf(s.status);
              return (
                <li key={t} className={`flex-1 border-2 border-tinta px-1 py-0.5 text-center ${i < kini ? "bg-tinta text-kertas" : i === kini ? "bg-oranye text-kertas" : "text-pudar"}`}>
                  {t === "menunggu_ketua" ? "Ketua" : t === "menunggu_mahasiswa" ? "Mahasiswa" : t === "menyambung" ? "Sambung" : "Live"}
                </li>
              );
            })}
          </ol>
        )}

        {s.reason && <p>Alasan: “{s.reason}”</p>}
        <p className={aktif ? "" : "text-marun"}>
          {aktif ? STATUS_LAYAR[s.status] : keteranganLayar(s)}
          {menunggu && <span className="font-mono text-pudar"> · {sisaDetik(s, now)} dtk</span>}
        </p>

        {peran === "mahasiswa" && s.status === "menunggu_mahasiswa" && (
          <p className="text-pudar">
            {s.approver && `Sudah disetujui ketua kelas ${s.approver.name}. `}
            Layar tidak direkam. Kamu sendiri yang memilih layar atau jendela yang dibagikan, dan bisa menghentikannya kapan saja.
          </p>
        )}

        {peran === "penonton" && (s.status === "menyambung" || s.status === "live") && (stream ? <Video stream={stream} penuh={besar} /> : <p className="label-mono">Menunggu gambar…</p>)}

        <div className="flex flex-wrap gap-2">
          {giliran && (
            <button
              type="button"
              className="tombol bg-tinta text-kertas"
              disabled={busy}
              onClick={() => jalankan(() => (peran === "ketua" ? aksi(s.id, "setujui") : izinkan(s)))}
            >
              {peran === "ketua" ? "Setujui" : "Izinkan"}
            </button>
          )}
          {giliran && (
            <button type="button" className="tombol" disabled={busy} onClick={() => jalankan(() => aksi(s.id, "tolak"))}>
              Tolak
            </button>
          )}
          {aktif && !giliran && (
            <button type="button" className="tombol" disabled={busy} onClick={() => jalankan(() => aksi(s.id, "stop"))}>
              {s.status === "live" ? "Hentikan" : "Batalkan"}
            </button>
          )}
          {stream && (
            <button type="button" className="tombol" onClick={() => setBesar((v) => !v)}>
              {besar ? "Perkecil" : "Perbesar"}
            </button>
          )}
          {!aktif && (
            <button type="button" className="tombol" onClick={() => buang(s.id)}>
              Tutup
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Video({ stream, penuh }: { stream: MediaStream; penuh: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return <video ref={ref} autoPlay playsInline muted className={`block w-full border-2 border-tinta bg-tinta ${penuh ? "min-h-0 flex-1 object-contain" : ""}`} />;
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { Track } from "livekit-client";
import { useRapat } from "./penyedia";

function Video({ track, label, share = false }: { track: Track; label: string; share?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current!;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);
  return <video ref={ref} aria-label={label} muted playsInline autoPlay className={`aspect-video w-full bg-tinta ${share ? "object-contain" : "object-cover"}`} />;
}

function Audio({ track }: { track: Track }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current!;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);
  return <audio ref={ref} autoPlay />;
}

export function PanelMedia() {
  const { rapat, media, toggle, alatSibuk, bukaAudio, ulang, kirim, sibuk, pesan, kursiScene } = useRapat();
  const [kecil, setKecil] = useState(false);
  if (!rapat?.self) return null;
  const saya = rapat.self;
  const sendiri = media?.orang.find((p) => p.lokal);
  const hadir = rapat.participants.filter((p) => p.status === "hadir");
  const tersambung = media?.status === "tersambung";
  const tunggu = kursiScene !== undefined && kursiScene !== `seat_${saya.seat}`;
  return <aside aria-label="Media ruang rapat" className="fixed bottom-2 left-2 z-40 max-h-[70dvh] max-w-[calc(100vw-1rem)] overflow-auto border-2 border-tinta bg-kertas">
    {media?.orang.flatMap((p) => p.audio.map((track) => <Audio key={track.sid ?? track.mediaStreamTrack.id} track={track} />))}
    <div className="flex items-center justify-between gap-3 border-b-2 px-3 py-2">
      <h2 className="font-bold">{rapat.title || "Ruang rapat"}</h2>
      <button className="tombol" aria-expanded={!kecil} onClick={() => setKecil(!kecil)}>{kecil ? "Tampilkan panel" : "Kecilkan"}</button>
    </div>
    {!kecil && <div className="grid w-[min(28rem,calc(100vw-1.5rem))] gap-2 p-3">
      {media?.orang.filter((p) => p.layar).map((p) => <figure key={p.id}>
        <Video track={p.layar!} label={`Layar ${p.nama}`} share /><figcaption className="text-sm">Layar {p.nama}</figcaption>
      </figure>)}
      <ul className="grid grid-cols-2 gap-1.5">{media?.orang.filter((p) => p.id).map((p) => <li key={p.id} className="min-w-0 border border-tinta bg-white">
        {p.video && <Video track={p.video} label={`Kamera ${p.nama}`} />}
        <div className="break-words px-2 py-1 text-sm"><b>{p.bicara && "🔊 "}{p.nama}</b><p>{p.mic ? "Mic aktif" : "Mic mati"}</p></div>
      </li>)}</ul>
      {hadir.filter((p) => !media?.orang.some((u) => p.user_id ? String(p.user_id) === u.id : rapat.participants.indexOf(p) === u.slot)).map((p) =>
        <p key={p.seat} className="text-sm">{p.name} · menunggu media</p>)}
      {!tersambung && <p role="status" className="text-sm">{media?.pesan || (media?.status === "terputus" ? "Media terputus." : tunggu ? "Menuju kursi rapat…" : "Menyambung media…")}</p>}
      {tersambung && media?.pesan && <p role="alert" className="text-sm text-marun">{media.pesan}</p>}
      {pesan && <p role="alert" className="text-sm text-marun">{pesan}</p>}
      <div className="flex flex-wrap gap-1.5">
        {media?.status === "terputus" && <button className="tombol" onClick={ulang}>Sambungkan ulang</button>}
        {tersambung && media?.perluKlik && <button className="tombol" onClick={bukaAudio}>Aktifkan suara</button>}
        {(["mic", "kamera", "layar"] as const).map((alat) => {
          const aktif = alat === "mic" ? sendiri?.mic : alat === "kamera" ? !!sendiri?.video : !!sendiri?.layar;
          return <button key={alat} className="tombol" aria-pressed={!!aktif} disabled={!tersambung || !!alatSibuk} onClick={() => toggle(alat)}>
            {alat === "layar" ? aktif ? "Hentikan berbagi" : "Bagikan layar" : `${aktif ? "Matikan" : "Nyalakan"} ${alat}`}
          </button>;
        })}
        {saya.seat.startsWith("tamu_") && <button className="tombol text-marun" disabled={sibuk} onClick={() => kirim(`/api/meeting-participants/${saya.id}`, "PATCH", { status: "keluar" })}>Keluar rapat</button>}
      </div>
    </div>}
  </aside>;
}

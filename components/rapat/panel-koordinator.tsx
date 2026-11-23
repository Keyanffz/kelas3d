"use client";

import { useState } from "react";
import { bolehPanggil, kursiKosong, kursiTamu, memesan } from "@/lib/rapat";
import type { PresenceList } from "@/lib/types";
import { useRapat } from "./penyedia";

export function PanelKoordinator({ rooms, onBuka }: { rooms: Record<string, PresenceList>; onBuka: () => void }) {
  const { rapat, siap, sibuk, pesan, kirim, muat, bukaAudio, lepasAudio } = useRapat();
  const [panel, setPanel] = useState(false);
  const [topik, setTopik] = useState("");
  const [userId, setUserId] = useState("");
  const [seat, setSeat] = useState("");
  const kosong = rapat ? kursiKosong(rapat) : [];
  const calon = Object.entries(rooms).flatMap(([kelas, room]) => room.data.filter((p) => rapat && bolehPanggil(p, rapat)).map((p) => ({ id: p.user.id, name: p.user.name, kelas })));
  const pilih = kosong.includes(seat) ? seat : kosong[0];
  const orang = calon.find((p) => p.id === Number(userId));
  return <>
    <button className="tombol" aria-expanded={panel} onClick={() => setPanel(!panel)}>{rapat ? "Kelola rapat" : "Buka rapat"}</button>
    {panel && <section aria-label="Kelola rapat" className="absolute right-1 top-full z-40 max-h-[75dvh] w-96 max-w-[calc(100vw-0.5rem)] overflow-auto border-2 border-tinta bg-kertas p-3">
      <header className="flex items-center justify-between gap-2"><h2 className="font-bold">{rapat?.title || "Ruang rapat"}</h2><button className="tombol" onClick={() => setPanel(false)}>Tutup panel</button></header>
      {pesan && <p role="alert" className="mt-2 text-sm text-marun">{pesan}</p>}
      {!siap ? <button className="tombol mt-3" onClick={muat}>Muat rapat</button> : !rapat ? <form className="mt-3 grid gap-2" onSubmit={async (e) => {
        e.preventDefault();
        bukaAudio();
        if (await kirim("/api/meetings", "POST", { title: topik.trim() || null })) { onBuka(); setTopik(""); }
        else lepasAudio();
      }}>
        <label className="text-sm">Topik (opsional)<input className="mt-1 w-full border-2 bg-white p-1" maxLength={255} value={topik} onChange={(e) => setTopik(e.target.value)} /></label>
        <button className="tombol bg-tinta text-kertas" disabled={sibuk}>Buka rapat</button>
      </form> : <>
        <label className="mt-3 block text-sm">Peserta yang dipanggil
          <select value={orang ? userId : ""} onChange={(e) => setUserId(e.target.value)} className="mt-1 w-full border-2 bg-white p-1">
            <option value="">Pilih peserta</option>
            {calon.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.kelas}</option>)}
          </select>
        </label>
        <fieldset className="my-3"><legend className="text-sm">Pilih kursi tamu</legend>
          <div className="my-2 flex items-end justify-center gap-1 py-2">
            {kursiTamu.slice().reverse().map((k, i) => <button type="button" key={k} aria-pressed={pilih === k} aria-label={`Kursi tamu ${k.slice(5)}`}
              className={`tombol min-h-10 ${pilih === k ? "bg-marun text-white" : ""}`} style={{ marginBottom: Math.abs(i - 3) ** 2 * 3 }}
              disabled={!kosong.includes(k)} onClick={() => setSeat(k)}>{k.slice(5)}</button>)}
          </div>
          <button className="tombol w-full bg-tinta text-kertas" disabled={sibuk || !orang || !pilih} onClick={async () => {
            if (orang && await kirim(`/api/meetings/${rapat.id}/participants`, "POST", [{ user_id: orang.id, seat: pilih }])) setUserId("");
          }}>Panggil{orang ? ` ${orang.name}` : ""}</button>
        </fieldset>
        <ul className="divide-y border-y-2">{rapat.participants.map((p) => <li key={p.id} className="py-2 text-sm">
          <p><b>{p.name}</b> · {p.seat.replace("_", " ")} · {p.status}</p>
          {p.classroom && memesan(p.status) && <div className="mt-1 flex gap-2">
            <select aria-label={`Pindah kursi ${p.name}`} className="border-2 bg-white" disabled={sibuk || !kosong.length} value="" onChange={(e) => kirim(`/api/meeting-participants/${p.id}`, "PATCH", { seat: e.target.value })}>
              <option value="">Pindah kursi</option>{kosong.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}
            </select>
            <button className="tombol" disabled={sibuk} onClick={() => kirim(`/api/meeting-participants/${p.id}`, "PATCH", { status: "dikeluarkan" })}>Keluarkan</button>
          </div>}
        </li>)}</ul>
        <button className="tombol mt-3 text-marun" disabled={sibuk} onClick={() => kirim(`/api/meetings/${rapat.id}`, "PATCH", { status: "selesai" })}>Tutup rapat</button>
      </>}
    </section>}
  </>;
}

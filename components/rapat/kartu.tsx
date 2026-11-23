"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Rapat } from "@/lib/rapat";
import { PanelMedia } from "./panel-media";
import { useRapat } from "./penyedia";

function Panggilan({ rapat, saya }: { rapat: Rapat; saya: NonNullable<Rapat["self"]> }) {
  const { kirim, muat, pesan, sibuk, bukaAudio, lepasAudio } = useRapat();
  const router = useRouter();
  const path = usePathname();
  const akhir = Date.parse(saya.expires_at ?? "");
  const [sekarang, setSekarang] = useState(() => Date.now());
  const detik = Math.max(0, Math.ceil((akhir - sekarang) / 1000));
  useEffect(() => {
    const timer = setInterval(() => setSekarang(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (detik === 0) void muat(); }, [detik, muat]);
  async function jawab(hadir: boolean) {
    const asal = rapat.participants.find((p) => p.seat === saya.seat && p.status === "dipanggil")?.classroom;
    if (hadir) bukaAudio();
    const berhasil = await kirim(`/api/meeting-participants/${saya.id}`, "PATCH", { status: hadir ? "hadir" : "menolak" });
    if (!berhasil && hadir) lepasAudio();
    if (berhasil && hadir && asal && path !== `/kelas/${asal}`) {
      router.push(`/kelas/${asal}`);
    }
  }
  return <section aria-label="Panggilan rapat" className="fixed bottom-3 right-3 z-50 w-80 max-w-[calc(100%-1.5rem)] border-2 border-tinta bg-kertas p-4">
    <h2 className="font-bold">Panggilan ke ruang koordinator</h2>
    <p className="my-2 text-sm">{saya.inviter} mengundangmu ke kursi tamu {saya.seat.slice(5)}.</p>
    <p className="font-mono text-sm">Sisa {Math.floor(detik / 60)}:{String(detik % 60).padStart(2, "0")}</p>
    {pesan && <p role="alert" className="text-sm text-marun">{pesan}</p>}
    <div className="mt-3 flex gap-2">
      <button className="tombol bg-marun text-white" disabled={sibuk || !detik} onClick={() => jawab(true)}>Masuk</button>
      <button className="tombol" disabled={sibuk || !detik} onClick={() => jawab(false)}>Nanti dulu</button>
    </div>
  </section>;
}

export function KartuRapat() {
  const { rapat } = useRapat();
  const saya = rapat?.self;
  if (!rapat || !saya) return null;
  if (saya.status === "dipanggil") return <Panggilan key={saya.expires_at} rapat={rapat} saya={saya} />;
  if (saya.status !== "hadir") return null;
  return <PanelMedia key={rapat.id} />;
}

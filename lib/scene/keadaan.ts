import type { Activity, Presence } from "../types";
import { roomKey } from "./graf";

export type Klip =
  | "diam"
  | "jalan"
  | "mundur"
  | "belok_kiri"
  | "belok_kanan"
  | "duduk"
  | "berdiri"
  | "duduk_ngetik"
  | "duduk_santai"
  | "angkat_tangan"
  | "ngomong";

// Ke mana avatar pergi dan klip apa yang main di sana. Nama titik mengikuti gedung.glb.
export type Tujuan =
  | { kind: "keluar" }
  | { kind: "duduk"; point: string; clip: Klip }
  | { kind: "berdiri"; point: string; clip: Klip; via?: string[] };

export const sameTujuan = (a: Tujuan, b: Tujuan) => JSON.stringify(a) === JSON.stringify(b);

const urutTitik = (names: string[], prefix: string) =>
  names.filter((n) => n.startsWith(prefix)).sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));

// Keputusan Tahap B di rencana: kursi saat di kelas, idle, atau terputus; jam istirahat ke beanbag
// sampai penuh lalu titik berdiri; keluar lewat pintu. Anggota tanpa kursi tidak muncul di 3D.
export function tujuanKelas(list: Presence[], slug: string, titik: string[]): Map<number, Tujuan> {
  const key = roomKey(slug);
  const rest = urutTitik(titik, `rest_${key}_`);
  const stand = urutTitik(titik, `stand_${key}_`);
  const out = new Map<number, Tujuan>();

  const istirahat = list
    .filter((p) => p.seat_code && p.state === "istirahat" && p.state_reason === "jadwal_istirahat")
    .sort((a, b) => a.seat_code!.localeCompare(b.seat_code!, "en", { numeric: true }));
  istirahat.forEach((p, i) => {
    const point = i < rest.length ? rest[i] : stand[i - rest.length];
    if (point) out.set(p.user.id, { kind: point.startsWith("rest_") ? "duduk" : "berdiri", point, clip: point.startsWith("rest_") ? "duduk_santai" : "diam" });
  });

  for (const p of list) {
    if (!p.seat_code || out.has(p.user.id)) continue;
    if (p.state === "keluar") {
      out.set(p.user.id, { kind: "keluar" });
      continue;
    }
    const clip: Klip =
      p.help_request?.status === "menunggu" ? "angkat_tangan" : p.state === "di_kelas" ? "duduk_ngetik" : "duduk_santai";
    out.set(p.user.id, { kind: "duduk", point: `seat_${key}_${p.seat_code}`, clip });
  }
  return out;
}

// Koordinator yang berkunjung keliling titik wp_ kelas itu, lalu berdiri di titik terakhir menghadap kelas.
export function tujuanKunjungan(slug: string, titik: string[]): Tujuan {
  const via = urutTitik(titik, `wp_${roomKey(slug)}_`);
  return { kind: "berdiri", point: via[via.length - 1], clip: "diam", via: via.slice(0, -1) };
}

const LAYAR: Record<Activity, string> = {
  ngoding: "#2563eb",
  vibe_coding: "#9333ea",
  ngolah_data: "#16a34a",
  browsing: "#eab308",
  main_game: "#dc2626",
  lainnya: "#a8a29e",
};

// Warna layar laptop di meja peserta: menyala sesuai aktivitas, redup saat istirahat, mati saat keluar.
export function warnaLayar(p: Presence | undefined): string {
  if (!p || p.state === "keluar") return "#0c0a09";
  if (p.state === "istirahat") return "#44403c";
  return p.activity ? LAYAR[p.activity] : LAYAR.lainnya;
}

import type { Adegan } from "./scene/keadaan";
import type { ScreenSession, ScreenStatus } from "./types";

export const TAHAP_LAYAR: ScreenStatus[] = ["menunggu_ketua", "menunggu_mahasiswa", "menyambung", "live"];

export const STATUS_LAYAR: Record<ScreenStatus, string> = {
  menunggu_ketua: "Menunggu ketua kelas",
  menunggu_mahasiswa: "Menunggu mahasiswa",
  menyambung: "Menyambungkan",
  live: "Live",
  ditolak: "Ditolak",
  kedaluwarsa: "Kedaluwarsa",
  selesai: "Selesai",
};

export const sesiAktif = (s: ScreenSession) => TAHAP_LAYAR.includes(s.status);

// Sesi dari REST dan event digabung per id, terbaru dulu.
export function applySesi(list: ScreenSession[], s: ScreenSession): ScreenSession[] {
  return [s, ...list.filter((x) => x.id !== s.id)].sort((a, b) => b.id - a.id);
}

export type PeranLayar = "penonton" | "mahasiswa" | "ketua";

// Ketua kelas yang layarnya diminta diperlakukan sebagai mahasiswa.
export function peranLayar(s: ScreenSession, meId: number): PeranLayar {
  if (s.target.id === meId) return "mahasiswa";
  return s.viewer.id === meId ? "penonton" : "ketua";
}

// Kenapa sesi berakhir, atau statusnya kalau masih berjalan.
export function keteranganLayar(s: ScreenSession): string {
  const oleh = s.closed_by?.name ?? "";
  switch (s.close_reason) {
    case "ditolak_ketua":
      return `Ditolak ketua kelas ${oleh}`.trim();
    case "ditolak_mahasiswa":
      return `Ditolak ${s.target.name}`;
    case "izin_browser":
      return `${s.target.name} tidak jadi membagikan layar`;
    case "terputus":
      return "Koneksi terputus";
    case "batas_waktu":
      return "Batas waktu sesi habis";
    case "dihentikan":
      return `${s.started_at ? "Dihentikan" : "Dibatalkan"} ${oleh}`.trim();
  }
  return s.status === "kedaluwarsa" ? "Tidak direspons sampai waktunya habis" : STATUS_LAYAR[s.status];
}

export function sisaDetik(s: ScreenSession, now: number): number {
  return s.expires_at ? Math.max(0, Math.ceil((new Date(s.expires_at).getTime() - now) / 1000)) : 0;
}

// Selama menunggu ketua kelas, koordinator berdiri di meja ketua dan menyampaikan permintaannya.
export function adeganLayar(list: ScreenSession[], slug?: string): Adegan | null {
  const s = list.find((x) => x.status === "menunggu_ketua" && (!slug || x.classroom === slug));
  if (!s) return null;
  return { from: s.viewer, classroom: s.classroom, message: `Minta lihat layar ${s.target.name}${s.reason ? `: ${s.reason}` : ""}` };
}

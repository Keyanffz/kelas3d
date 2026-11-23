import type { Avatar, Presence } from "./types";

export const kursiTamu = Array.from({ length: 7 }, (_, i) => `tamu_${i + 1}`);
export type StatusRapat = "dipanggil" | "hadir" | "menolak" | "kedaluwarsa" | "keluar" | "dikeluarkan";
export interface PosisiRapat { user_id: number; seat: string; status: StatusRapat }
export interface PesertaRapat {
  name: string;
  classroom: string | null;
  seat: string;
  status: StatusRapat;
  id?: number;
  user_id?: number;
}
export interface Rapat {
  id: number;
  status: "aktif" | "selesai";
  title?: string | null;
  participants: PesertaRapat[];
  self?: { id: number; seat: string; status: StatusRapat; inviter: string | null; expires_at: string | null };
}

export const memesan = (s: StatusRapat) => s === "dipanggil" || s === "hadir";
export const kursiKosong = (rapat: Rapat) => kursiTamu.filter((k) => !rapat.participants.some((p) => p.seat === k && memesan(p.status)));
export const bolehPanggil = (p: Presence, rapat: Rapat) =>
  p.state !== "keluar" && !rapat.participants.some((x) => x.user_id === p.user.id && memesan(x.status));

export function terimaPosisi(list: Presence[], e: PosisiRapat): Presence[] {
  return list.map((p) => p.user.id === e.user_id ? { ...p, meeting: e } : p);
}

export function gabungRapat(lama: Rapat | null, baru: Rapat): Rapat {
  if (lama && (lama.id > baru.id || (lama.id === baru.id && lama.status === "selesai"))) return lama;
  return baru;
}

export function tampilanMedia(metadata?: string): { slot?: number; avatar?: Avatar } {
  if (!metadata) return {};
  try {
    const data = JSON.parse(metadata);
    if (!data || !Number.isInteger(data.slot) || data.slot < 0) return {};
    const avatar = data.avatar;
    const warna = avatar?.warna;
    const valid = (avatar?.tipe_badan === "laki" || avatar?.tipe_badan === "perempuan") &&
      typeof avatar.rambut === "string" && /^rambut_[1-5]$/.test(avatar.rambut) &&
      [warna?.kulit, warna?.rambut, warna?.celana].every((v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v));
    return { slot: data.slot, avatar: valid ? avatar : undefined };
  } catch { return {}; }
}

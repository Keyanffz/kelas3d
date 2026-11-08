import type { Avatar } from "../types";
import { roomKey } from "./graf";

export const AVATAR_BAWAAN: Avatar = {
  tipe_badan: "laki",
  rambut: "rambut_1",
  warna: { kulit: "#e0ac69", rambut: "#2b1b17", celana: "#1f2937" },
};

export const WARNA_KOKARD = { koordinator: "#ea580c", peserta: "#7f1d1d" } as const;

export interface Rakitan {
  tipe: Avatar["tipe_badan"];
  rambut: Avatar["rambut"];
  hijab: boolean;
  // Patch dada kiri: kelas_developer atau kelas_data_science; koordinator tanpa patch.
  patch: string | null;
  ketua: boolean;
  warna: { kulit: string; rambut: string; celana: string; tali_kokard: string };
}

export function rakit(
  avatar: Avatar | null,
  opsi: { slug: string | null; ketua: boolean; koordinator: boolean },
): Rakitan {
  const a = avatar ?? AVATAR_BAWAAN;
  return {
    tipe: a.tipe_badan,
    rambut: a.rambut,
    hijab: a.rambut === "rambut_5",
    patch: opsi.slug && !opsi.koordinator ? `kelas_${roomKey(opsi.slug)}` : null,
    ketua: opsi.ketua,
    warna: { ...a.warna, tali_kokard: opsi.koordinator ? WARNA_KOKARD.koordinator : WARNA_KOKARD.peserta },
  };
}

// true/false untuk bagian yang bisa diganti, null untuk bagian tetap (kepala, badan, lengan, kokard).
export function bagianTampil(r: Rakitan, name: string): boolean | null {
  if (/^rambut_\d$/.test(name)) return name === r.rambut;
  if (name.startsWith("kelas_")) return name === r.patch;
  if (name === "aksesoris_ketua") return r.ketua;
  // Set rok menggantikan paha dan betis bercelana saat badan perempuan memakai hijab.
  if (/^perempuan_rok_(paha|betis)_[lr]$/.test(name)) return r.hijab;
  if (/^perempuan_(paha|betis)_[lr]$/.test(name)) return !r.hijab;
  return null;
}

export const MATERIAL_WARNA = ["kulit", "rambut", "celana", "tali_kokard"] as const;

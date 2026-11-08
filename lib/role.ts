import type { Me } from "./types";

// Halaman awal tiap role. null berarti peserta yang belum dimasukkan ke kelas mana pun.
export function homePath(me: Me): string | null {
  if (me.role === "koordinator") return "/gedung";
  const first = me.classrooms[0];
  return first ? `/kelas/${first.slug}` : null;
}

// Koordinator dan ketua kelas itu boleh melihat detail kerjaan dan channel staf.
export function isStaff(me: Me, slug: string): boolean {
  return me.role === "koordinator" || me.classrooms.some((c) => c.slug === slug && c.role === "admin");
}

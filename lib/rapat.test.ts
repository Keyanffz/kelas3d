import { expect, it } from "vitest";
import { bolehPanggil, gabungRapat, kursiKosong, terimaPosisi, type Rapat } from "./rapat";
import type { Presence } from "./types";

const rapat: Rapat = { id: 8, status: "aktif", participants: [
  { name: "Ayu", user_id: 2, seat: "tamu_3", status: "dipanggil", classroom: "developer" },
  { name: "Bayu", user_id: 3, seat: "tamu_1", status: "keluar", classroom: "developer" },
] };
const hadir: Presence = { member_id: 3, role: "anggota", user: { id: 3, name: "Bayu", avatar: null }, state: "di_kelas", seat_code: "a1", state_reason: null, activity: null, app_label: null, state_since: null, last_heartbeat_at: null, help_request: null, focus: false };

it("kursi dan hak panggil mengikuti reservasi dan presence", () => {
  expect(kursiKosong(rapat)).toHaveLength(6);
  expect(kursiKosong(rapat)).toContain("tamu_1");
  expect(bolehPanggil(hadir, rapat)).toBe(true);
  expect(bolehPanggil({ ...hadir, state: "keluar" }, rapat)).toBe(false);
  expect(bolehPanggil({ ...hadir, user: { ...hadir.user, id: 2 } }, rapat)).toBe(false);
});
it("event kelas hanya mengubah posisi rapat dan snapshot lama tidak membuka kembali rapat selesai", () => {
  const e = { user_id: 3, status: "hadir", seat: "tamu_2" } as const;
  expect(terimaPosisi([hadir], e)).toEqual([{ ...hadir, meeting: e }]);
  const tutup = { ...rapat, status: "selesai" } as const;
  expect(gabungRapat(tutup, rapat)).toBe(tutup);
  expect(gabungRapat(tutup, { ...rapat, id: 9 }).id).toBe(9);
});

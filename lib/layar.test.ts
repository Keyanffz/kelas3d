import { describe, expect, it } from "vitest";
import { adeganLayar, applySesi, keteranganLayar, peranLayar, sesiAktif, sisaDetik } from "./layar";
import type { ScreenSession } from "./types";

const sesi = (over: Partial<ScreenSession> = {}): ScreenSession => ({
  id: 1,
  classroom: "developer",
  viewer: { id: 1, name: "Koordinator" },
  target: { id: 7, name: "Budi" },
  help_request_id: null,
  approver: null,
  reason: null,
  status: "menunggu_ketua",
  close_reason: null,
  closed_by: null,
  expires_at: "2026-11-10T09:01:00+07:00",
  started_at: null,
  ended_at: null,
  created_at: "2026-11-10T09:00:00+07:00",
  ...over,
});

describe("sesi lihat layar", () => {
  it("menggabungkan event per id, terbaru dulu", () => {
    const list = applySesi(applySesi([], sesi()), sesi({ id: 2 }));
    const next = applySesi(list, sesi({ status: "live" }));
    expect(next.map((s) => [s.id, s.status])).toEqual([
      [2, "menunggu_ketua"],
      [1, "live"],
    ]);
  });

  it("membedakan sesi berjalan dan yang sudah berakhir", () => {
    expect((["menunggu_ketua", "menunggu_mahasiswa", "menyambung", "live"] as const).every((status) => sesiAktif(sesi({ status })))).toBe(true);
    expect((["ditolak", "kedaluwarsa", "selesai"] as const).some((status) => sesiAktif(sesi({ status })))).toBe(false);
  });

  it("menentukan peran, dan ketua yang dituju jadi mahasiswa", () => {
    expect(peranLayar(sesi(), 1)).toBe("penonton");
    expect(peranLayar(sesi(), 7)).toBe("mahasiswa");
    expect(peranLayar(sesi(), 3)).toBe("ketua");
  });

  it("menjelaskan kenapa sesi berakhir", () => {
    const ketua = { id: 3, name: "Sinta" };
    expect(keteranganLayar(sesi())).toBe("Menunggu ketua kelas");
    expect(keteranganLayar(sesi({ status: "ditolak", close_reason: "ditolak_ketua", closed_by: ketua }))).toBe("Ditolak ketua kelas Sinta");
    expect(keteranganLayar(sesi({ status: "ditolak", close_reason: "ditolak_mahasiswa" }))).toBe("Ditolak Budi");
    expect(keteranganLayar(sesi({ status: "kedaluwarsa" }))).toBe("Tidak direspons sampai waktunya habis");
    expect(keteranganLayar(sesi({ status: "selesai", close_reason: "dihentikan", closed_by: ketua }))).toBe("Dibatalkan Sinta");
    expect(keteranganLayar(sesi({ status: "selesai", close_reason: "dihentikan", closed_by: ketua, started_at: "2026-11-10T09:00:30+07:00" }))).toBe("Dihentikan Sinta");
  });

  it("menghitung sisa waktu tanpa jadi negatif", () => {
    const mulai = new Date("2026-11-10T09:00:00+07:00").getTime();
    expect(sisaDetik(sesi(), mulai + 15_400)).toBe(45);
    expect(sisaDetik(sesi(), mulai + 90_000)).toBe(0);
    expect(sisaDetik(sesi({ expires_at: null }), mulai)).toBe(0);
  });

  it("adegan ke meja ketua cuma selama menunggu ketua kelas, di kelas yang diminta", () => {
    expect(adeganLayar([sesi({ reason: "dari tadi browsing" })])).toEqual({
      from: { id: 1, name: "Koordinator" },
      classroom: "developer",
      message: "Minta lihat layar Budi: dari tadi browsing",
    });
    expect(adeganLayar([sesi()], "data-science")).toBeNull();
    expect(adeganLayar([sesi({ status: "menunggu_mahasiswa" })])).toBeNull();
  });
});

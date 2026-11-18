import { describe, expect, it } from "vitest";
import { kelompokkan } from "./progres";

const days = [
  { date: "2026-10-30", aktif: 100, ngoding: 50 },
  { date: "2026-11-16", aktif: 3600, ngoding: 1800 },
  { date: "2026-11-17", aktif: 600, ngoding: 0 },
  { date: "2026-11-18", aktif: 60, ngoding: 60 },
];

describe("kelompokkan", () => {
  it("per hari: 14 hari sampai hari ini, hari kosong tetap ada", () => {
    const hasil = kelompokkan(days, "hari", "2026-11-18");
    expect(hasil).toHaveLength(14);
    expect(hasil[0].kunci).toBe("2026-11-05");
    expect(hasil.at(-1)).toMatchObject({ kunci: "2026-11-18", aktif: 60, ngoding: 60 });
    expect(hasil.at(-4)).toMatchObject({ kunci: "2026-11-15", aktif: 0 });
  });

  it("per minggu mulai Senin, melewati batas bulan", () => {
    const hasil = kelompokkan(days, "minggu", "2026-11-18");
    expect(hasil).toHaveLength(8);
    expect(hasil.at(-1)).toMatchObject({ kunci: "2026-11-16", aktif: 4260, ngoding: 1860 });
    expect(hasil.find((k) => k.kunci === "2026-10-26")).toMatchObject({ aktif: 100 });
  });

  it("per bulan lewat pergantian tahun", () => {
    expect(kelompokkan(days, "bulan", "2026-11-18").map((k) => [k.kunci, k.aktif])).toEqual([
      ["2026-09", 0],
      ["2026-10", 100],
      ["2026-11", 4260],
    ]);
    expect(kelompokkan([], "bulan", "2027-01-05").map((k) => k.kunci)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});

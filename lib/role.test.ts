import { describe, expect, it } from "vitest";
import { homePath, isStaff } from "./role";
import type { Me } from "./types";

const base: Me = { id: 1, name: "Sinta", email: "sinta@kelas3d.test", role: "peserta", avatar: null, classrooms: [] };
const developer = { id: 1, name: "Developer", slug: "developer", seat_code: "a1" };

describe("homePath", () => {
  it("koordinator ke gedung", () => {
    expect(homePath({ ...base, role: "koordinator" })).toBe("/gedung");
  });

  it("anggota ke kelasnya", () => {
    expect(homePath({ ...base, classrooms: [{ ...developer, role: "anggota" }] })).toBe("/kelas/developer");
  });

  it("peserta tanpa kelas tidak punya tujuan", () => {
    expect(homePath(base)).toBeNull();
  });
});

describe("isStaff", () => {
  it("koordinator staf di semua kelas", () => {
    expect(isStaff({ ...base, role: "koordinator" }, "data-science")).toBe(true);
  });

  it("ketua kelas cuma staf di kelasnya", () => {
    const ketua: Me = { ...base, classrooms: [{ ...developer, role: "admin" }] };
    expect(isStaff(ketua, "developer")).toBe(true);
    expect(isStaff(ketua, "data-science")).toBe(false);
  });

  it("anggota biasa bukan staf", () => {
    expect(isStaff({ ...base, classrooms: [{ ...developer, role: "anggota" }] }, "developer")).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KURSI } from "../kursi";
import type { Presence } from "../types";
import { belok, buatGraf, depan, rute, type Titik } from "./graf";
import { Gerak, type Badan } from "./gerak";
import { tujuanKelas, tujuanKunjungan, warnaLayar } from "./keadaan";
import { bagianTampil, rakit } from "./tampilan";

// Titik dibaca langsung dari gedung.glb. Akar ruangannya tanpa transform, jadi translasi titik sudah posisi dunia.
function titikGlb(): Titik[] {
  const b = readFileSync("public/models/gedung.glb");
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()) as {
    nodes: { name: string; translation?: number[]; rotation?: number[] }[];
  };
  return json.nodes
    .filter((n) => /^(seat|rest|stand|door|wp)_/.test(n.name))
    .map((n) => {
      const [x = 0, , z = 0] = n.translation ?? [];
      const [qx = 0, qy = 0, qz = 0, qw = 1] = n.rotation ?? [];
      return { name: n.name, x, z, yaw: Math.atan2(2 * (qw * qy + qx * qz), 1 - 2 * (qy * qy + qx * qx)) };
    });
}

const titik = titikGlb();
const names = titik.map((t) => t.name);
const graf = buatGraf(titik);
const at = (name: string) => graf.titik.get(name)!;
const near = (p: { x: number; z: number }, q: { x: number; z: number }) => Math.hypot(p.x - q.x, p.z - q.z) < 0.02;

function presence(id: number, extra: Partial<Presence>): Presence {
  return {
    member_id: id,
    role: "anggota",
    seat_code: `a${id}`,
    user: { id, name: `P${id}`, avatar: null },
    state: "di_kelas",
    state_reason: null,
    activity: "ngoding",
    app_label: null,
    state_since: null,
    last_heartbeat_at: null,
    help_request: null,
    ...extra,
  };
}

describe("graf gedung", () => {
  it("memuat 98 titik", () => {
    expect(titik).toHaveLength(98);
  });

  it("daftar kursi web sama dengan titik seat_ di gedung", () => {
    for (const [slug, codes] of Object.entries(KURSI)) {
      const prefix = `seat_${slug.replaceAll("-", "_")}_`;
      expect(names.filter((n) => n.startsWith(prefix)).map((n) => n.slice(prefix.length)).sort()).toEqual([...codes].sort());
    }
  });

  it("rute masuk dari pintu gedung ke kursi lewat lorong dan pintu kelas", () => {
    const seat = at("seat_developer_a1");
    const path = rute(graf, { ...at("door_gedung"), room: "lorong" }, { ...depan(seat), room: "developer" });
    const lewat = ["wp_lorong_1", "wp_lorong_2", "door_developer", "wp_developer_1", "wp_developer_2"];
    expect(lewat.every((n, i) => near(path[i + 1], at(n)))).toBe(true);
    // Masuk ke lorong meja tepat di belakang kursi, lalu maju ke depan kursi.
    expect(near(path[path.length - 2], { x: at("wp_developer_2").x, z: seat.z })).toBe(true);
    expect(near(path[path.length - 1], depan(seat))).toBe(true);
    expect(near(depan(seat), { x: seat.x + 0.3, z: seat.z })).toBe(true);
  });

  it("rute di dalam satu kelas tidak lewat lorong", () => {
    const path = rute(graf, { ...depan(at("seat_data_science_b4")), room: "data_science" }, { ...depan(at("rest_data_science_1")), room: "data_science" });
    expect(path.every((p) => p.z < -1)).toBe(true);
  });

  it("rute antarkelas lewat lorong", () => {
    const path = rute(graf, { ...depan(at("seat_developer_c1")), room: "developer" }, { ...at("seat_data_science_a1"), room: "data_science" });
    expect(path.some((p) => near(p, at("wp_lorong_2")))).toBe(true);
    expect(path.some((p) => near(p, at("door_data_science")))).toBe(true);
  });

  it("titik belakang kursi ada di lorong meja", () => {
    expect(near(at("seat_developer_a1_belakang"), { x: at("seat_developer_a1").x - 0.55, z: at("seat_developer_a1").z })).toBe(true);
    const path = rute(graf, { ...at("seat_developer_b1_belakang"), room: "developer" }, { ...at("door_developer"), room: "developer" });
    expect(path.length).toBeGreaterThan(2);
  });

  it("belok 90 derajat per tikungan", () => {
    expect(belok(0, Math.PI / 2)).toEqual(["kiri"]);
    expect(belok(0, -Math.PI / 2)).toEqual(["kanan"]);
    expect(belok(Math.PI / 2, -Math.PI / 2 + 0.01)).toEqual(["kanan", "kanan"]);
    expect(belok(0, 0.3)).toEqual([]);
  });
});

describe("tujuan per keadaan", () => {
  it("mengikuti tabel keputusan Tahap B", () => {
    const t = tujuanKelas(
      [
        presence(1, {}),
        presence(2, { state: "istirahat", state_reason: "idle" }),
        presence(3, { help_request: { id: 1, note: null, status: "menunggu" } }),
        presence(4, { state: "keluar" }),
        presence(5, { seat_code: null }),
      ],
      "developer",
      names,
    );
    expect(t.get(1)).toEqual({ kind: "duduk", point: "seat_developer_a1", clip: "duduk_ngetik" });
    expect(t.get(2)).toEqual({ kind: "duduk", point: "seat_developer_a2", clip: "duduk_santai" });
    expect(t.get(3)).toMatchObject({ point: "seat_developer_a3", clip: "angkat_tangan" });
    expect(t.get(4)).toEqual({ kind: "keluar" });
    expect(t.has(5)).toBe(false);
  });

  it("jam istirahat mengisi beanbag dulu, sisanya titik berdiri", () => {
    const list = [1, 2, 3, 4, 5].map((i) => presence(i, { state: "istirahat", state_reason: "jadwal_istirahat", seat_code: `c${6 - i}` }));
    const t = tujuanKelas(list, "data-science", names);
    // Urut kode kursi: c1 (user 5) dapat beanbag pertama.
    expect(t.get(5)).toEqual({ kind: "duduk", point: "rest_data_science_1", clip: "duduk_santai" });
    expect(t.get(2)).toEqual({ kind: "duduk", point: "rest_data_science_4", clip: "duduk_santai" });
    expect(t.get(1)).toEqual({ kind: "berdiri", point: "stand_data_science_1", clip: "diam" });
  });

  it("kunjungan keliling wp_ kelas lalu berdiri di titik terakhir", () => {
    expect(tujuanKunjungan("developer", names)).toEqual({
      kind: "berdiri",
      point: "wp_developer_8",
      clip: "diam",
      via: ["wp_developer_1", "wp_developer_2", "wp_developer_3", "wp_developer_4", "wp_developer_5", "wp_developer_6", "wp_developer_7"],
    });
  });

  it("warna layar laptop", () => {
    expect(warnaLayar(undefined)).toBe("#0c0a09");
    expect(warnaLayar(presence(1, { activity: "vibe_coding" }))).toBe("#9333ea");
    expect(warnaLayar(presence(1, { state: "istirahat" }))).toBe("#44403c");
  });
});

describe("rakitan avatar", () => {
  it("hijab di badan perempuan memakai set rok", () => {
    const r = rakit({ tipe_badan: "perempuan", rambut: "rambut_5", warna: { kulit: "#111111", rambut: "#222222", celana: "#333333" } }, { slug: "data-science", ketua: true, koordinator: false });
    expect(bagianTampil(r, "rambut_5")).toBe(true);
    expect(bagianTampil(r, "rambut_3")).toBe(false);
    expect(bagianTampil(r, "perempuan_rok_paha_l")).toBe(true);
    expect(bagianTampil(r, "perempuan_paha_l")).toBe(false);
    expect(bagianTampil(r, "kelas_data_science")).toBe(true);
    expect(bagianTampil(r, "kelas_developer")).toBe(false);
    expect(bagianTampil(r, "aksesoris_ketua")).toBe(true);
    expect(bagianTampil(r, "perempuan_kepala")).toBeNull();
    expect(r.warna).toEqual({ kulit: "#111111", rambut: "#222222", celana: "#333333", tali_kokard: "#7f1d1d" });
  });

  it("tanpa hijab memakai celana, koordinator tanpa patch dan kokard oranye", () => {
    const r = rakit({ tipe_badan: "perempuan", rambut: "rambut_4", warna: { kulit: "#111111", rambut: "#222222", celana: "#333333" } }, { slug: null, ketua: false, koordinator: true });
    expect(bagianTampil(r, "perempuan_rok_betis_r")).toBe(false);
    expect(bagianTampil(r, "perempuan_betis_r")).toBe(true);
    expect(bagianTampil(r, "kelas_developer")).toBe(false);
    expect(bagianTampil(r, "aksesoris_ketua")).toBe(false);
    expect(r.warna.tali_kokard).toBe("#ea580c");
  });

  it("avatar kosong memakai tampilan bawaan", () => {
    const r = rakit(null, { slug: "developer", ketua: false, koordinator: false });
    expect(r).toMatchObject({ tipe: "laki", rambut: "rambut_1", patch: "kelas_developer" });
  });
});

describe("gerak avatar", () => {
  function jalankan(gerak: Gerak, detik: number) {
    for (let t = 0; t < detik; t += 0.05) gerak.update(0.05);
  }

  it("masuk dari pintu, belok di tikungan, duduk, lalu mengetik", () => {
    const plays: string[] = [];
    let yaw = 0;
    const badan: Badan = {
      pose: (_x, _z, y) => (yaw = y),
      visible: () => undefined,
      play: (clip, { fade }) => {
        plays.push(`${clip}${fade === 0 ? "!" : ""}`);
        return clip === "duduk" ? 1.33 : 1;
      },
    };
    const gerak = new Gerak(graf, "door_gedung", { kind: "keluar" }, badan);
    expect(gerak.pose.visible).toBe(false);

    gerak.setTujuan({ kind: "duduk", point: "seat_developer_a1", clip: "duduk_ngetik" });
    jalankan(gerak, 40);

    expect(gerak.pose).toMatchObject({ visible: true, seated: "seat_developer_a1", room: "developer" });
    expect(near(gerak.pose, depan(at("seat_developer_a1")))).toBe(true);
    expect(Math.abs(Math.sin(yaw - at("seat_developer_a1").yaw))).toBeLessThan(0.01);
    expect(plays).toContain("jalan");
    expect(plays.some((p) => p.startsWith("belok_"))).toBe(true);
    // Sesudah belok langsung ke diam tanpa crossfade.
    const i = plays.findIndex((p) => p.startsWith("belok_"));
    expect(plays[i + 1]).toBe("diam!");
    expect(plays.slice(-2)).toEqual(["duduk", "duduk_ngetik"]);
    expect(gerak.sedangJalan).toBe(false);
  });

  it("keluar: berdiri, mundur dari meja, lalu menghilang di pintu", () => {
    const plays: string[] = [];
    let visible = true;
    const badan: Badan = { pose: () => undefined, visible: (v) => (visible = v), play: (clip) => (plays.push(clip), 1) };
    const gerak = new Gerak(graf, "door_gedung", { kind: "duduk", point: "seat_developer_b2", clip: "duduk_ngetik" }, badan);

    gerak.setTujuan({ kind: "keluar" });
    jalankan(gerak, 60);

    expect(plays.slice(0, 3)).toEqual(["duduk_ngetik", "berdiri", "mundur"]);
    expect(visible).toBe(false);
    expect(near(gerak.pose, at("door_gedung"))).toBe(true);
  });
});

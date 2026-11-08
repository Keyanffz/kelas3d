// Jalur jalan avatar lewat titik wp_ dan door_ di gedung.glb, tanpa navmesh.
// Koordinat memakai sumbu Three.js: x ke timur, z ke selatan, yaw 0 menghadap +z.

export interface Vec {
  x: number;
  z: number;
}

export interface Titik extends Vec {
  name: string;
  yaw: number;
}

interface Edge {
  a: string;
  b: string;
  room: string;
}

export interface Graf {
  titik: Map<string, Titik>;
  edges: Edge[];
}

// Posisi beserta ruangannya; titik cuma disambung ke jalur di ruangan yang sama, supaya tidak menembus dinding.
export interface Lokasi extends Vec {
  room: string;
}

const nomor = (name: string) => Number(name.slice(name.lastIndexOf("_") + 1));
export const jarak = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);

// "data-science" → "data_science", sama dengan nama titik dan ruangan di gedung.glb.
export const roomKey = (slug: string) => slug.replaceAll("-", "_");

function waypoints(titik: Titik[], room: string): string[] {
  return titik
    .filter((t) => t.name.startsWith(`wp_${room}_`))
    .sort((p, q) => nomor(p.name) - nomor(q.name))
    .map((t) => t.name);
}

export function buatGraf(list: Titik[]): Graf {
  const titik = new Map(list.map((t) => [t.name, t]));
  // Titik di lorong meja tepat di belakang tiap kursi peserta, menghadap kursinya.
  // Dipakai koordinator saat menyampaikan teguran ke ketua kelas.
  for (const t of list) {
    if (/^seat_(developer|data_science)_/.test(t.name)) titik.set(`${t.name}_belakang`, { ...t, ...depan(t, -0.55), name: `${t.name}_belakang` });
  }
  const edges: Edge[] = [];
  const rantai = (names: string[], room: string) => {
    for (let i = 0; i + 1 < names.length; i++) edges.push({ a: names[i], b: names[i + 1], room });
  };

  const lorong = ["door_gedung", ...waypoints(list, "lorong")];
  rantai(lorong, "lorong");

  for (const door of list.filter((t) => t.name.startsWith("door_") && t.name !== "door_gedung")) {
    const room = door.name.slice("door_".length);
    // Pintu ruangan disambung ke titik lorong terdekat.
    const dekat = lorong.reduce((best, n) => (jarak(titik.get(n)!, door) < jarak(titik.get(best)!, door) ? n : best));
    edges.push({ a: dekat, b: door.name, room: "lorong" });

    const wp = waypoints(list, room);
    rantai([door.name, ...wp], room);
    // Rute keliling kelas berupa lingkaran; ruangan dengan dua titik (koordinator) cukup garis.
    if (wp.length >= 3) edges.push({ a: wp[wp.length - 1], b: wp[0], room });
  }

  return { titik, edges };
}

function proyeksi(p: Vec, a: Vec, b: Vec): { at: Vec; d: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  const at = { x: a.x + t * dx, z: a.z + t * dz };
  return { at, d: jarak(p, at) };
}

// Titik terdekat di jalur ruangan itu, beserta ujung-ujung edge-nya.
function sambung(graf: Graf, lok: Lokasi): { at: Vec; a: string; b: string } {
  let best: { at: Vec; d: number; a: string; b: string } | null = null;
  for (const e of graf.edges) {
    if (e.room !== lok.room) continue;
    const p = proyeksi(lok, graf.titik.get(e.a)!, graf.titik.get(e.b)!);
    if (!best || p.d < best.d) best = { ...p, a: e.a, b: e.b };
  }
  if (!best) throw new Error(`Ruangan ${lok.room} tidak punya jalur`);
  return best;
}

// Urutan posisi dari `dari` ke `ke`, termasuk kedua ujungnya. Titik pintu dihitung bagian ruangannya.
export function rute(graf: Graf, dari: Lokasi, ke: Lokasi): Lokasi[] {
  const A = sambung(graf, dari);
  const B = sambung(graf, ke);
  const pos = new Map<string, Vec>(graf.titik);
  pos.set("@a", A.at);
  pos.set("@b", B.at);

  const sisi: [string, string][] = graf.edges.map((e) => [e.a, e.b]);
  sisi.push(["@a", A.a], ["@a", A.b], ["@b", B.a], ["@b", B.b]);
  // Dua-duanya di edge yang sama: boleh langsung tanpa lewat ujung edge.
  if ((A.a === B.a && A.b === B.b) || (A.a === B.b && A.b === B.a)) sisi.push(["@a", "@b"]);

  // Dijkstra sederhana; graf gedung cuma puluhan simpul.
  const dist = new Map<string, number>([["@a", 0]]);
  const prev = new Map<string, string>();
  const done = new Set<string>();
  while (!done.has("@b")) {
    let cur: string | null = null;
    for (const [n, d] of dist) if (!done.has(n) && (cur === null || d < dist.get(cur)!)) cur = n;
    if (cur === null) throw new Error("Tidak ada rute");
    done.add(cur);
    for (const [a, b] of sisi) {
      const next = a === cur ? b : b === cur ? a : null;
      if (!next || done.has(next)) continue;
      const d = dist.get(cur)! + jarak(pos.get(cur)!, pos.get(next)!);
      if (d < (dist.get(next) ?? Infinity)) {
        dist.set(next, d);
        prev.set(next, cur);
      }
    }
  }

  const names = ["@b"];
  while (names[0] !== "@a") names.unshift(prev.get(names[0])!);
  const room = (n: string) => (n === "@a" ? dari.room : n === "@b" ? ke.room : ruangTitik(n));
  const titik: Lokasi[] = [
    dari,
    ...names.map((n) => ({ ...pos.get(n)!, room: room(n) })),
    ke,
  ].map(({ x, z, room }) => ({ x, z, room }));
  return titik.filter((p, i) => i === 0 || jarak(p, titik[i - 1]) > 0.05);
}

export const yawOf = (from: Vec, to: Vec) => Math.atan2(to.x - from.x, to.z - from.z);

export function selisihYaw(dari: number, ke: number): number {
  let d = (ke - dari) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Belok 90 derajat di tikungan; sisa sudut kecil diputar halus sambil jalan.
export function belok(dari: number, ke: number): ("kiri" | "kanan")[] {
  const d = selisihYaw(dari, ke);
  const arah = d > 0 ? "kiri" : "kanan";
  if (Math.abs(d) < Math.PI / 4) return [];
  if (Math.abs(d) <= (Math.PI * 3) / 4) return [arah];
  return [arah, arah];
}

// Avatar berdiri 0,3 m di depan titik seat_ atau rest_ sebelum duduk.
export function depan(t: Titik, d = 0.3): Vec {
  return { x: t.x + Math.sin(t.yaw) * d, z: t.z + Math.cos(t.yaw) * d };
}

export function ruangTitik(name: string): string {
  if (name === "door_gedung" || name.startsWith("wp_lorong_")) return "lorong";
  const m = name.match(/^(?:seat|rest|stand|door|wp)_(developer|data_science|koordinator)/);
  if (!m) throw new Error(`Titik tidak dikenal: ${name}`);
  return m[1];
}

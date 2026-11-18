import { readFileSync } from "node:fs";
import { AnimationMixer, Box3, Mesh, SkinnedMesh, Vector3, type Object3D } from "three";
import { GLTFLoader, type GLTF } from "three-stdlib";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { expect, it } from "vitest";
import { bagianTampil, rakit } from "@/lib/scene/tampilan";
import { buatAvatar } from "./avatar";
import { siapkan } from "./dunia";

// Tes yang memuat file .glb langsung: persiapan gedung dan rakitan avatar.
function muat(nama: string): Promise<GLTF> {
  const b = readFileSync(`public/models/${nama}.glb`);
  const buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  return new Promise((ok, gagal) => new GLTFLoader().parse(buf, "", ok, gagal));
}

function semuaMesh(root: Object3D): Mesh[] {
  const out: Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh) out.push(o);
  });
  return out;
}

const segitiga = (root: Object3D) => semuaMesh(root).reduce((n, m) => n + m.geometry.index!.count / 3, 0);

it("gedung digabung tanpa menggeser atau membuang segitiga", async () => {
  const gltf = await muat("gedung");
  const awal = new Box3().setFromObject(gltf.scene);
  const d = siapkan(gltf.scene.clone(true));

  expect(segitiga(d.root)).toBe(segitiga(gltf.scene));
  expect(semuaMesh(d.root).length).toBeLessThan(semuaMesh(gltf.scene).length / 2);
  expect(d.bounds.min.distanceTo(awal.min) + d.bounds.max.distanceTo(awal.max)).toBeLessThan(1e-4);
  // Dinding, kusen, pintu, dan layar laptop tetap objek sendiri di scene.
  for (const o of d.tembok) expect(o.parent).not.toBeNull();
  const layar = new Set(semuaMesh(d.root).map((m) => m.material));
  for (const m of d.layar.values()) expect(layar.has(m)).toBe(true);
});

it("pintu mulai tertutup di dalam kusen, dan kusennya tidak ikut berputar", async () => {
  const d = siapkan((await muat("gedung")).scene.clone(true));
  expect(d.pintu).toHaveLength(3);
  for (const p of d.pintu) {
    const kusen = p.pivot.parent!.children.find((c) => c !== p.pivot)!;
    expect(kusen.parent).toBe(p.pivot.parent);
    const k = new Box3().setFromObject(kusen);
    const daun = new Box3().setFromObject(p.pivot);
    // Semua pintu ada di dinding utara-selatan: tertutup berarti tipis di z dan di dalam lebar kusen.
    expect(daun.max.z - daun.min.z).toBeLessThan(0.15);
    expect(daun.min.x).toBeGreaterThan(k.min.x);
    expect(daun.max.x).toBeLessThan(k.max.x);
    expect(Math.abs((daun.min.z + daun.max.z) / 2 - (k.min.z + k.max.z) / 2)).toBeLessThan(0.15);
  }
});

it.each(["laki", "perempuan"] as const)("avatar %s jadi satu mesh yang bergerak sama dengan bagian aslinya", async (tipe) => {
  const gltf = await muat(`avatar-${tipe}`);
  const r = rakit(
    { tipe_badan: tipe, rambut: "rambut_5", warna: { kulit: "#c68642", rambut: "#1e3a8a", celana: "#1f2937" } },
    { slug: "developer", ketua: true, koordinator: false },
  );
  const gabungan = buatAvatar(gltf, r);
  const asli = clone(gltf.scene);
  asli.traverse((o) => {
    const t = bagianTampil(r, o.name);
    if (t !== null) o.visible = t;
  });

  // Pose di tengah duduk_ngetik: pinggul turun, lengan dan kaki menekuk.
  const klip = gltf.animations.find((c) => c.name === "duduk_ngetik")!;
  for (const root of [gabungan, asli]) {
    const mixer = new AnimationMixer(root);
    mixer.clipAction(klip).play();
    mixer.update(0.7);
    root.updateMatrixWorld(true);
  }

  const meshes = semuaMesh(gabungan);
  expect(meshes).toHaveLength(1);
  const kulit = meshes[0] as SkinnedMesh;
  const v = new Vector3();
  const w = new Vector3();
  let i = 0;
  let selisih = 0;
  asli.traverseVisible((o) => {
    if (!(o instanceof Mesh)) return;
    const pos = o.geometry.attributes.position;
    for (let j = 0; j < pos.count; j++, i++) {
      kulit.getVertexPosition(i, v).applyMatrix4(kulit.matrixWorld);
      w.fromBufferAttribute(pos, j).applyMatrix4(o.matrixWorld);
      selisih = Math.max(selisih, v.distanceTo(w));
    }
  });
  expect(i).toBe(kulit.geometry.attributes.position.count);
  expect(selisih).toBeLessThan(1e-4);
});

it.each(["laki", "perempuan"] as const)("avatar %s yang fokus memakai headphone di tulang kepala, di luar kepala dan rambutnya", async (tipe) => {
  const gltf = await muat(`avatar-${tipe}`);
  const avatar = { tipe_badan: tipe, rambut: "rambut_3", warna: { kulit: "#c68642", rambut: "#1e3a8a", celana: "#1f2937" } } as const;
  const opsi = { slug: "developer", ketua: false, koordinator: false };
  const biasa = semuaMesh(buatAvatar(gltf, rakit(avatar, opsi)))[0] as SkinnedMesh;
  const fokus = semuaMesh(buatAvatar(gltf, rakit(avatar, { ...opsi, fokus: true })))[0] as SkinnedMesh;

  const awal = biasa.geometry.attributes.position.count;
  const pos = fokus.geometry.attributes.position;
  // Lima balok: bando, dua tangkai, dua bantalan.
  expect(pos.count - awal).toBe(5 * 24);

  const kepala = fokus.skeleton.bones.findIndex((b) => b.name === "kepala");
  biasa.geometry.computeBoundingBox();
  const badan = biasa.geometry.boundingBox!;
  const headphone = new Box3();
  const v = new Vector3();
  for (let i = awal; i < pos.count; i++) {
    expect(fokus.geometry.attributes.skinIndex.getX(i)).toBe(kepala);
    headphone.expandByPoint(v.fromBufferAttribute(pos, i));
  }
  // Di atas ubun-ubun dan lebih lebar dari badan di sisi kepala, tapi tidak melayang jauh.
  expect(headphone.max.y).toBeGreaterThan(badan.max.y);
  expect(headphone.max.y - badan.max.y).toBeLessThan(0.05);
  expect(headphone.min.y).toBeGreaterThan(badan.max.y - 0.5);
  expect(Math.abs(headphone.min.x + headphone.max.x)).toBeLessThan(0.02);
});

it.each(["topi_1", "topi_2"])("%s menempel di tulang kepala di atas rambut, dan tetap ada bersama headphone", async (id) => {
  const gltf = await muat("avatar-perempuan");
  const avatar = { tipe_badan: "perempuan", rambut: "rambut_5", warna: { kulit: "#c68642", rambut: "#1e3a8a", celana: "#1f2937" } } as const;
  const opsi = { slug: "developer", ketua: false, koordinator: false };
  const biasa = semuaMesh(buatAvatar(gltf, rakit(avatar, opsi)))[0] as SkinnedMesh;
  const bertopi = semuaMesh(buatAvatar(gltf, rakit({ ...avatar, aksesoris: { topi: id, meja: null } }, opsi)))[0] as SkinnedMesh;
  const keduanya = semuaMesh(buatAvatar(gltf, rakit({ ...avatar, aksesoris: { topi: id, meja: null } }, { ...opsi, fokus: true })))[0] as SkinnedMesh;

  const awal = biasa.geometry.attributes.position.count;
  const pos = bertopi.geometry.attributes.position;
  expect(pos.count - awal).toBe(2 * 24);
  expect(keduanya.geometry.attributes.position.count - awal).toBe(7 * 24);

  const kepala = bertopi.skeleton.bones.findIndex((b) => b.name === "kepala");
  biasa.geometry.computeBoundingBox();
  const badan = biasa.geometry.boundingBox!;
  const t = new Box3();
  const v = new Vector3();
  for (let i = awal; i < pos.count; i++) {
    expect(bertopi.geometry.attributes.skinIndex.getX(i)).toBe(kepala);
    t.expandByPoint(v.fromBufferAttribute(pos, i));
  }
  expect(t.max.y).toBeGreaterThan(badan.max.y);
  expect(t.max.y - badan.max.y).toBeLessThan(0.15);
  expect(t.min.y).toBeGreaterThan(badan.max.y - 0.15);
});

it("tiap kursi punya laptop di atas meja buat item meja", async () => {
  const d = siapkan((await muat("gedung")).scene.clone(true));
  const kursi = d.names.filter((n) => /^seat_(developer|data_science)_[a-c]\d$/.test(n));
  expect(kursi).toHaveLength(32);
  for (const n of kursi) {
    const laptop = d.laptop.get(n.slice("seat_".length));
    expect(laptop, n).toBeDefined();
    expect(laptop!.min.y).toBeGreaterThan(0.7);
    expect(laptop!.min.y).toBeLessThan(0.8);
  }
});

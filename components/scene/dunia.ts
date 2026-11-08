import { Box3, BufferGeometry, Euler, Group, Matrix4, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3, type Material } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buatGraf, type Graf, type Titik, type Vec } from "@/lib/scene/graf";

// Gedung yang sudah disiapkan untuk web: titik, akar ruangan, dinding, pintu, layar laptop, dan penghalang mode Jelajah.
export interface Dunia {
  root: Object3D;
  graf: Graf;
  names: string[];
  akar: Map<string, Object3D>;
  lantai: Map<string, Box3>;
  bounds: Box3;
  dinding: { obj: Object3D; normal: Vec }[];
  pintu: Pintu[];
  // Material layar per kursi, kunci `<kelas>_<kode>` seperti "developer_a1".
  layar: Map<string, MeshStandardMaterial>;
  // Dinding, kusen, dan daun pintu: dicek dengan raycast karena punya lubang pintu.
  tembok: Object3D[];
  // Furnitur sebagai kotak di bidang lantai.
  kotak: Box3[];
}

export interface Pintu {
  // Pivot di engsel, berisi daun dan gagang. Rotasi 0 = terbuka seperti di model.
  pivot: Group;
  // Tengah lubang pintu, buat cek avatar atau pemain yang dekat.
  center: Vec;
  // Rotasi pivot saat tertutup.
  tutup: number;
  buka: boolean;
}

const ARAH: Record<string, Vec> = {
  utara: { x: 0, z: -1 },
  selatan: { x: 0, z: 1 },
  timur: { x: 1, z: 0 },
  barat: { x: -1, z: 0 },
};
const FURNITUR = /^(kursi|meja|beanbag|lemari|printer|kanban|papan_tulis|tv)/;

export function siapkan(root: Object3D): Dunia {
  root.updateMatrixWorld(true);
  const titik: Titik[] = [];
  const akar = new Map<string, Object3D>();
  const lantai = new Map<string, Box3>();
  const dinding: Dunia["dinding"] = [];
  const layar = new Map<string, MeshStandardMaterial>();
  const tembok: Object3D[] = [];
  const kotak: Box3[] = [];
  const pintuObj: Object3D[] = [];
  const pos = new Vector3();
  const quat = new Quaternion();
  const euler = new Euler();

  for (const child of root.children) akar.set(akarKey(child.name), child);

  root.traverse((o) => {
    // Cuma objek langsung di bawah akar ruangan. Anak mesh buatan loader memakai nama data mesh
    // (misalnya laptop_3 untuk layar), yang bisa menyerupai nama objek.
    if (o.parent?.parent !== root) return;
    const n = o.name;
    if (/^(seat|rest|stand|door|wp)_/.test(n)) {
      o.getWorldPosition(pos);
      o.getWorldQuaternion(quat);
      titik.push({ name: n, x: pos.x, z: pos.z, yaw: euler.setFromQuaternion(quat, "YXZ").y });
      return;
    }
    const wall = n.match(/_dinding_(utara|selatan|timur|barat)$/);
    if (wall) {
      dinding.push({ obj: o, normal: ARAH[wall[1]] });
      tembok.push(o);
    } else if (/_kusen$/.test(n)) tembok.push(o);
    else if (/_pintu$/.test(n)) pintuObj.push(o);
    else if (/_lantai$/.test(n)) lantai.set(n.replace(/_lantai$/, ""), new Box3().setFromObject(o));
    else if (/^laptop_/.test(n)) {
      o.traverse((m) => {
        if (m instanceof Mesh && m.material instanceof MeshStandardMaterial && m.material.name === "layar_laptop") {
          // Material layar dipakai bersama semua laptop; tiap laptop dapat salinannya sendiri.
          m.material = m.material.clone();
          layar.set(n.slice("laptop_".length), m.material);
        }
      });
    } else if (FURNITUR.test(n)) {
      const box = new Box3().setFromObject(o);
      if (box.min.y < 1.2 && box.max.y > 0.25) kotak.push(box);
    }
  });

  const graf = buatGraf(titik);
  const pintu = pintuObj.map((obj): Pintu => {
    // Daun pintu dimodelkan terbuka 90 derajat ke dalam ruangan, satu objek dengan kusennya.
    // Daun dan gagang dipindah ke pivot di engsel; kusen tetap diam.
    const bagian = obj.children.filter((m): m is Mesh => m instanceof Mesh);
    const kusen = bagian.find((m) => (m.material as Material).name === "kusen");
    const lubang = new Box3().setFromObject(kusen ?? obj).getCenter(new Vector3()).setY(0);
    const daun = new Box3().setFromObject(bagian.find((m) => (m.material as Material).name === "pintu") ?? obj);
    const tengah = daun.getCenter(new Vector3()).setY(0);
    // Engsel di ujung daun yang paling dekat lubang pintu.
    const ujung =
      daun.max.z - daun.min.z > daun.max.x - daun.min.x
        ? [new Vector3(tengah.x, 0, daun.min.z), new Vector3(tengah.x, 0, daun.max.z)]
        : [new Vector3(daun.min.x, 0, tengah.z), new Vector3(daun.max.x, 0, tengah.z)];
    const engsel = ujung.sort((a, b) => a.distanceTo(lubang) - b.distanceTo(lubang))[0];
    const pivot = new Group();
    obj.add(pivot);
    pivot.position.copy(obj.worldToLocal(engsel.clone()));
    pivot.updateMatrixWorld(true);
    for (const m of bagian) if (m !== kusen) pivot.attach(m);
    // Tertutup: daun diputar 90 derajat ke arah tengah lubang pintu.
    const d = tengah.sub(engsel);
    const t = lubang.clone().sub(engsel);
    const tutup = Math.sign(d.z * t.x - d.x * t.z) * (Math.PI / 2);
    pivot.rotation.y = tutup;
    tembok.push(obj);
    return { pivot, center: { x: lubang.x, z: lubang.z }, tutup, buka: false };
  });

  // Dinding, kusen, dan pintu tetap terpisah karena disembunyikan, diputar, dan dipakai raycast.
  // Layar laptop juga, karena warnanya per kursi.
  const tetap = new Set(tembok);
  for (const ruang of akar.values()) {
    gabung(ruang, (m) => {
      if ((m.material as Material).name === "layar_laptop") return true;
      for (let o: Object3D | null = m; o && o !== ruang; o = o.parent) if (tetap.has(o)) return true;
      return false;
    });
  }

  return {
    root,
    graf,
    names: titik.map((t) => t.name),
    akar,
    lantai,
    bounds: new Box3().setFromObject(root),
    dinding,
    pintu,
    layar,
    tembok,
    kotak,
  };
}

const akarKey = (name: string) => (name === "lorong" ? "lorong" : name.replace(/^ruang_/, ""));

// Mesh statis di bawah `induk` digabung jadi satu mesh per material: ratusan draw call jadi puluhan.
// Cukup posisi dan normal, karena semua material berwarna polos tanpa tekstur.
function gabung(induk: Object3D, lewati: (m: Mesh) => boolean) {
  const balik = induk.matrixWorld.clone().invert();
  const per = new Map<Material, BufferGeometry[]>();
  const lama: Mesh[] = [];
  induk.traverse((o) => {
    if (!(o instanceof Mesh) || lewati(o)) return;
    const g = new BufferGeometry()
      .setIndex(o.geometry.index)
      .setAttribute("position", o.geometry.attributes.position.clone())
      .setAttribute("normal", o.geometry.attributes.normal.clone())
      .applyMatrix4(new Matrix4().multiplyMatrices(balik, o.matrixWorld));
    const list = per.get(o.material as Material) ?? [];
    list.push(g);
    per.set(o.material as Material, list);
    lama.push(o);
  });
  for (const o of lama) o.removeFromParent();
  for (const [mat, list] of per) induk.add(new Mesh(mergeGeometries(list), mat));
}

// Ruangan tempat sebuah posisi berada, dari kotak lantai tiap ruangan.
export function ruangDi(dunia: Dunia, p: Vec): string | null {
  for (const [room, box] of dunia.lantai) {
    if (p.x >= box.min.x && p.x <= box.max.x && p.z >= box.min.z && p.z <= box.max.z) return room;
  }
  return null;
}

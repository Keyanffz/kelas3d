"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Quaternion, Raycaster, Vector2, Vector3, type Object3D } from "three";
import { PointerLockControls } from "three-stdlib";
import { ruangDi, type Dunia, type Pintu } from "./dunia";

const MATA = 1.6;
const RADIUS = 0.28;
const LAJU = 2.2;
const LARI = 4;
// Jarak maksimal dari tengah lubang pintu supaya pintu bisa dibuka atau ditutup dengan E.
const JANGKAU_PINTU = 1.5;
const GERAK = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"]);

// Posisi dan arah pandang terakhir selama pointer terkunci, supaya masuk lagi ke Jelajah lanjut dari situ.
// Disimpan tiap frame, bukan saat keluar: OrbitControls drei sudah memutar kamera ke target saat dirender,
// sebelum cleanup Jelajah jalan. Di modul, jadi tetap ada walau scene dilepas (mode daftar) selama tab terbuka.
const terakhir = { ada: false, posisi: new Vector3(), arah: new Quaternion() };

// Pintu terdekat dalam jangkauan yang ada di depan pandangan (`maju` mendatar, sudah dinormalkan).
// Pintu di belakang atau di samping tidak dihitung, supaya E tidak membuka pintu lain di lorong.
function pintuDidepan(dunia: Dunia, p: Vector3, maju: Vector3): Pintu | null {
  let hasil: Pintu | null = null;
  let min = JANGKAU_PINTU;
  for (const d of dunia.pintu) {
    const vx = d.center.x - p.x;
    const vz = d.center.z - p.z;
    const jarak = Math.hypot(vx, vz);
    // Berdiri di ambang pintu, arah pandang tidak dicek; selain itu paling jauh 60 derajat dari depan.
    const didepan = jarak < 0.6 || (vx * maju.x + vz * maju.z) / jarak > 0.5;
    if (jarak < min && didepan) {
      min = jarak;
      hasil = d;
    }
  }
  return hasil;
}

// Mode Jelajah koordinator: sudut pandang orang pertama, WASD dan mouse, menabrak dinding dan meja.
export function Jelajah({
  dunia,
  hitbox,
  kontrol,
  onKunci,
  onBidik,
  onPintu,
  onPilih,
  onRuang,
}: {
  dunia: Dunia;
  hitbox: () => Object3D[];
  // Dipakai tombol di luar Canvas untuk mengunci pointer, karena lock butuh klik pengguna.
  kontrol: RefObject<PointerLockControls | null>;
  onKunci: (terkunci: boolean) => void;
  onBidik: (kunci: string | null) => void;
  // Pintu dalam jangkauan E: true kalau terbuka, false kalau tertutup, null kalau tidak ada.
  onPintu: (terbuka: boolean | null) => void;
  onPilih: (kunci: string) => void;
  onRuang: (room: string | null) => void;
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const ctrl = useMemo(() => new PointerLockControls(camera), [camera]);
  const tombol = useRef(new Set<string>());
  // undefined: belum pernah dilaporkan, jadi frame pertama selalu mengirim keadaan terbaru ke scene.
  const bidik = useRef<string | null | undefined>(undefined);
  const pintu = useRef<boolean | null | undefined>(undefined);
  // Pintu yang sedang ditampilkan prompt; tombol E memakai pintu ini juga.
  const sasaran = useRef<Pintu | null>(null);
  const ruang = useRef<string | null>(null);
  const jeda = useRef(0);
  const alat = useMemo(() => ({ ray: new Raycaster(), tengah: new Vector2(), maju: new Vector3(), kanan: new Vector3(), atas: new Vector3(0, 1, 0), o: new Vector3(), d: new Vector3() }), []);
  const cb = useRef({ onKunci, onBidik, onPintu, onPilih, onRuang });

  useEffect(() => {
    cb.current = { onKunci, onBidik, onPintu, onPilih, onRuang };
  });

  useEffect(() => {
    const lock = () => cb.current.onKunci(true);
    const unlock = () => {
      tombol.current.clear();
      cb.current.onKunci(false);
    };
    ctrl.connect(gl.domElement);
    ctrl.addEventListener("lock", lock);
    ctrl.addEventListener("unlock", unlock);
    kontrol.current = ctrl;
    return () => {
      if (ctrl.isLocked) ctrl.unlock();
      ctrl.removeEventListener("lock", lock);
      ctrl.removeEventListener("unlock", unlock);
      ctrl.disconnect();
      kontrol.current = null;
    };
  }, [ctrl, gl, kontrol]);

  useEffect(() => {
    if (terakhir.ada) {
      camera.position.copy(terakhir.posisi);
      camera.quaternion.copy(terakhir.arah);
    } else {
      // Pertama kali: mulai di ruang koordinator, menghadap pintu.
      const awal = dunia.graf.titik.get("wp_koordinator_1");
      if (awal) {
        camera.position.set(awal.x, MATA, awal.z);
        camera.lookAt(awal.x, MATA, awal.z - 1);
      }
    }

    const down = (e: KeyboardEvent) => {
      if (!ctrl.isLocked) return;
      if (GERAK.has(e.code)) tombol.current.add(e.code);
      if (e.code === "KeyE" && sasaran.current) sasaran.current.buka = !sasaran.current.buka;
    };
    const up = (e: KeyboardEvent) => tombol.current.delete(e.code);
    // Klik kiri ke avatar langsung mengganti detail; pointer tetap terkunci, jadi menu jeda tidak muncul.
    const klik = (e: MouseEvent) => {
      if (e.button === 0 && ctrl.isLocked && bidik.current) cb.current.onPilih(bidik.current);
    };
    const lepas = () => tombol.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", lepas);
    document.addEventListener("mousedown", klik);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", lepas);
      document.removeEventListener("mousedown", klik);
    };
  }, [camera, ctrl, dunia]);

  function bisaLewat(dx: number, dz: number): boolean {
    const len = Math.hypot(dx, dz);
    if (!len) return true;
    const p = camera.position;
    const x = p.x + dx;
    const z = p.z + dz;
    // Tepi badan di arah gerak harus tetap di atas lantai salah satu ruangan. Dinding jendela
    // dan pintu gedung berlubang, jadi tanpa ini pemain bisa keluar gedung.
    if (!ruangDi(dunia, { x: x + (dx / len) * RADIUS, z: z + (dz / len) * RADIUS })) return false;
    for (const b of dunia.kotak) {
      const di = (px: number, pz: number) => px > b.min.x - RADIUS && px < b.max.x + RADIUS && pz > b.min.z - RADIUS && pz < b.max.z + RADIUS;
      // Kotak yang sudah ditempati (misalnya mulai di samping kursi) tidak mengunci pemain.
      if (di(x, z) && !di(p.x, p.z)) return false;
    }
    // Dinding punya lubang pintu, jadi dicek dengan sinar setinggi pinggang, bukan kotak.
    const { ray, o, d } = alat;
    ray.set(o.set(p.x, 1, p.z), d.set(dx / len, 0, dz / len));
    ray.far = len + RADIUS;
    return ray.intersectObjects(dunia.tembok, true).length === 0;
  }

  useFrame((_, dt) => {
    if (!ctrl.isLocked) return;
    const t = tombol.current;
    const { maju, kanan, atas, ray, tengah } = alat;
    camera.getWorldDirection(maju);
    maju.y = 0;
    maju.normalize();
    kanan.crossVectors(maju, atas);
    const f = (t.has("KeyW") || t.has("ArrowUp") ? 1 : 0) - (t.has("KeyS") || t.has("ArrowDown") ? 1 : 0);
    const s = (t.has("KeyD") || t.has("ArrowRight") ? 1 : 0) - (t.has("KeyA") || t.has("ArrowLeft") ? 1 : 0);
    const len = Math.hypot(f, s);
    if (len) {
      const step = ((t.has("ShiftLeft") || t.has("ShiftRight") ? LARI : LAJU) * Math.min(dt, 0.1)) / len;
      const dx = (maju.x * f + kanan.x * s) * step;
      const dz = (maju.z * f + kanan.z * s) * step;
      // Per sumbu, supaya bisa menyusur dinding.
      if (bisaLewat(dx, 0)) camera.position.x += dx;
      if (bisaLewat(0, dz)) camera.position.z += dz;
    }
    camera.position.y = MATA;
    terakhir.posisi.copy(camera.position);
    terakhir.arah.copy(camera.quaternion);
    terakhir.ada = true;

    ray.setFromCamera(tengah, camera);
    ray.far = 8;
    const hit = ray.intersectObjects([...hitbox(), ...dunia.tembok], true)[0];
    const kunci = hit && typeof hit.object.userData.hitbox === "string" ? (hit.object.userData.hitbox as string) : null;
    if (kunci !== bidik.current) {
      bidik.current = kunci;
      cb.current.onBidik(kunci);
    }

    const dekat = pintuDidepan(dunia, camera.position, maju);
    sasaran.current = dekat;
    const terbuka = dekat ? dekat.buka : null;
    if (terbuka !== pintu.current) {
      pintu.current = terbuka;
      cb.current.onPintu(terbuka);
    }

    jeda.current += dt;
    if (jeda.current > 0.25) {
      jeda.current = 0;
      const r = ruangDi(dunia, camera.position);
      if (r && r !== ruang.current) {
        ruang.current = r;
        cb.current.onRuang(r);
      }
    }
  });

  return null;
}

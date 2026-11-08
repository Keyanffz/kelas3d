"use client";

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Vector3, type Box3 } from "three";
import type { OrbitControls as OrbitImpl, PointerLockControls } from "three-stdlib";
import { subAktivitas } from "@/lib/presence";
import { roomKey } from "@/lib/scene/graf";
import { tujuanKelas, tujuanKunjungan, warnaLayar, type Tujuan } from "@/lib/scene/keadaan";
import { rakit } from "@/lib/scene/tampilan";
import type { Coordinator, Me, PresenceList } from "@/lib/types";
import type { Teguran } from "@/lib/use-rooms";
import { Avatar, type Terdaftar } from "./avatar";
import { siapkan, type Dunia } from "./dunia";
import { Jelajah } from "./jelajah";

const MODEL = { gedung: "/models/gedung.glb", laki: "/models/avatar-laki.glb", perempuan: "/models/avatar-perempuan.glb" };
useGLTF.preload(Object.values(MODEL));

export interface SceneProps {
  me: Me;
  kelas: { slug: string; room: PresenceList }[];
  // Semua koordinator yang pernah terlihat, termasuk yang sudah selesai berkunjung.
  koordinator: Coordinator[];
  // true: seluruh gedung (koordinator). false: cuma ruangan kelas pertama.
  semua: boolean;
  staff: boolean;
  selected: number | null;
  onSelect: (userId: number, slug: string) => void;
  // Kelas yang sedang dikunjungi koordinator yang login; undefined untuk peserta.
  kunjungan?: string | null;
  jelajah?: boolean;
  onJelajah?: (on: boolean) => void;
  onRuang?: (slug: string | null) => void;
  adegan?: Teguran | null;
}

interface LabelData {
  kunci: string;
  nama: string;
  sub: string | null;
  tag: "ketua" | "koordinator" | null;
  tangan: boolean;
  saya: boolean;
  balon: string | null;
}

// Label di atas kepala: lapisan DOM biasa yang posisinya diproyeksikan tiap frame,
// lebih ringan daripada satu root React per avatar.
function daftarLabel({ me, kelas, koordinator, semua, adegan }: SceneProps): LabelData[] {
  const out: LabelData[] = [];
  for (const k of kelas) {
    for (const p of k.room.data) {
      if (!p.seat_code) continue;
      out.push({
        kunci: `p:${p.user.id}`,
        nama: p.user.name,
        sub: p.state === "keluar" ? null : subAktivitas(p),
        tag: p.role === "admin" ? "ketua" : null,
        tangan: p.help_request?.status === "menunggu",
        saya: p.user.id === me.id,
        balon: null,
      });
    }
  }
  const orang = new Map(koordinator.map((c) => [c.id, c]));
  if (me.role === "koordinator" && semua) orang.set(me.id, { id: me.id, name: me.name, avatar: me.avatar });
  for (const c of orang.values()) {
    out.push({
      kunci: `k:${c.id}`,
      nama: c.name,
      sub: null,
      tag: "koordinator",
      tangan: false,
      saya: c.id === me.id,
      balon: adegan?.from.id === c.id ? adegan.message : null,
    });
  }
  return out;
}

export default function Scene(props: SceneProps) {
  const kontrol = useRef<PointerLockControls | null>(null);
  const labelEl = useRef(new Map<string, HTMLDivElement>());
  const [siap, setSiap] = useState(false);
  const [terkunci, setTerkunci] = useState(false);
  const [bidik, setBidik] = useState<string | null>(null);
  const [pintu, setPintu] = useState<boolean | null>(null);
  const labels = daftarLabel(props);
  const infoBidik = bidik ? labels.find((l) => l.kunci === bidik) : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden bg-kertas-tua">
      <Canvas camera={{ fov: 45, near: 0.1, far: 200, position: [8, 14, 14] }} dpr={[1, 2]}>
        <color attach="background" args={["#e7dfd0"]} />
        <hemisphereLight args={["#fffaf0", "#9c937f", 1.5]} />
        <directionalLight position={[12, 18, 10]} intensity={1.6} />
        <directionalLight position={[-8, 10, -6]} intensity={0.5} />
        <Suspense fallback={null}>
          <Isi {...props} kontrol={kontrol} labelEl={labelEl} onSiap={setSiap} onKunci={setTerkunci} onBidik={setBidik} onPintu={setPintu} />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {labels.map((l) => (
          <div
            key={l.kunci}
            ref={(el) => {
              if (el) labelEl.current.set(l.kunci, el);
              else labelEl.current.delete(l.kunci);
            }}
            className="group absolute left-0 top-0 hidden origin-bottom"
          >
            <Label l={l} />
          </div>
        ))}
      </div>

      {!siap && <p className="label-mono absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">Memuat gedung…</p>}

      {props.jelajah && (
        <>
          {terkunci ? (
            <>
              <div className="pointer-events-none absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 border-2 border-tinta bg-kertas" />
              {pintu !== null && (
                <p className="pointer-events-none absolute left-1/2 top-1/2 mt-8 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap border-2 border-tinta bg-kertas px-3 py-1.5 text-sm">
                  Tekan
                  <kbd className="grid size-6 place-items-center border-2 border-tinta bg-white font-mono text-xs font-bold">E</kbd>
                  untuk {pintu ? "Menutup" : "Membuka"}
                </p>
              )}
              {infoBidik && (
                <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 border-2 border-tinta bg-kertas px-3 py-1.5 text-center">
                  <p className="font-bold">{infoBidik.nama}</p>
                  <p className="label-mono">
                    {infoBidik.sub ?? (infoBidik.tag === "koordinator" ? "Koordinator" : "")}
                    {infoBidik.kunci.startsWith("p:") && " · klik untuk detail"}
                  </p>
                </div>
              )}
              <p className="label-mono pointer-events-none absolute bottom-3 left-3 bg-kertas/90 px-2 py-1">WASD jalan · Shift lari · E buka pintu · klik avatar untuk detail · Esc lepas mouse</p>
            </>
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-tinta/40 p-4">
              <div className="w-full max-w-sm border-2 border-tinta bg-kertas p-4">
                <p className="label-mono">Mode jelajah</p>
                <p className="mt-1 text-sm">
                  Jalan keliling gedung dari sudut pandangmu sendiri. Masuk lewat pintu kelas berarti berkunjung, dan peserta di kelas itu melihat avatarmu datang.
                </p>
                <p className="label-mono mt-3">WASD jalan · Shift lari · E buka pintu · klik avatar untuk detail · Esc lepas mouse</p>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="tombol bg-tinta text-kertas" onClick={() => kontrol.current?.lock()}>
                    Mulai jelajah
                  </button>
                  <button type="button" className="tombol" onClick={() => props.onJelajah?.(false)}>
                    Kembali ke denah
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Label({ l }: { l: LabelData }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {l.balon && (
        <div className="max-w-56 border-2 border-tinta bg-white px-2 py-1 text-xs text-tinta shadow-[3px_3px_0_#1c1917] group-data-[diam=0]:hidden">{l.balon}</div>
      )}
      <div className={`whitespace-nowrap border-2 bg-kertas px-1.5 py-0.5 text-center leading-tight ${l.saya ? "border-oranye" : "border-tinta"}`}>
        <p className="text-[11px] font-bold">
          {l.tangan && <span className="mr-1 text-oranye">✋</span>}
          {l.nama}
        </p>
        {l.tag === "ketua" && <p className="font-mono text-[9px] uppercase tracking-wider text-marun">Ketua Kelas</p>}
        {l.tag === "koordinator" && <p className="font-mono text-[9px] uppercase tracking-wider text-oranye">Koordinator</p>}
        {l.sub && <p className="font-mono text-[9px] uppercase tracking-wide text-pudar">{l.sub}</p>}
      </div>
    </div>
  );
}

interface Sosok {
  kunci: string;
  tipe: "laki" | "perempuan";
  rakitan: ReturnType<typeof rakit>;
  tujuan: Tujuan;
  pick?: () => void;
}

function Isi(
  props: SceneProps & {
    kontrol: RefObject<PointerLockControls | null>;
    labelEl: RefObject<Map<string, HTMLDivElement>>;
    onSiap: (v: boolean) => void;
    onKunci: (v: boolean) => void;
    onBidik: (k: string | null) => void;
    onPintu: (terbuka: boolean | null) => void;
  },
) {
  const { me, kelas, semua, staff, selected, onSelect, kunjungan, jelajah, adegan, koordinator, onSiap } = props;
  const gedung = useGLTF(MODEL.gedung);
  const laki = useGLTF(MODEL.laki);
  const perempuan = useGLTF(MODEL.perempuan);
  const dunia = useMemo(() => siapkan(gedung.scene.clone(true)), [gedung.scene]);
  const avatars = useRef(new Map<string, Terdaftar>());
  const daftar = useCallback((kunci: string, a: Terdaftar | null) => {
    if (a) avatars.current.set(kunci, a);
    else avatars.current.delete(kunci);
  }, []);

  useEffect(() => {
    onSiap(true);
    return () => onSiap(false);
  }, [onSiap]);

  const utama = kelas[0]?.slug;
  const pintu = semua || !utama ? "door_gedung" : `door_${roomKey(utama)}`;

  const sosok = useMemo(() => {
    const out: Sosok[] = [];
    for (const k of kelas) {
      const tujuan = tujuanKelas(k.room.data, k.slug, dunia.names);
      for (const p of k.room.data) {
        const t = tujuan.get(p.user.id);
        if (!t) continue;
        out.push({
          kunci: `p:${p.user.id}`,
          tipe: p.user.avatar?.tipe_badan ?? "laki",
          rakitan: rakit(p.user.avatar, { slug: k.slug, ketua: p.role === "admin", koordinator: false }),
          tujuan: t,
          pick: staff ? () => onSelect(p.user.id, k.slug) : undefined,
        });
      }
    }

    const orang = new Map(koordinator.map((c) => [c.id, c]));
    if (me.role === "koordinator" && semua) orang.set(me.id, { id: me.id, name: me.name, avatar: me.avatar });
    for (const c of orang.values()) {
      if (c.id === me.id && jelajah) continue; // sudut pandang sendiri
      const visit =
        c.id === me.id && kunjungan !== undefined ? kunjungan : (kelas.find((k) => k.room.coordinators.some((x) => x.id === c.id))?.slug ?? null);
      let tujuan: Tujuan = { kind: "keluar" };
      if (visit && kelas.some((k) => k.slug === visit)) {
        const ketua = kelas.find((k) => k.slug === visit)?.room.data.find((p) => p.role === "admin" && p.seat_code);
        // Adegan teguran: koordinator berdiri di belakang kursi ketua kelas sambil bicara.
        tujuan =
          adegan && adegan.from.id === c.id && adegan.classroom === visit && ketua
            ? { kind: "berdiri", point: `seat_${roomKey(visit)}_${ketua.seat_code}_belakang`, clip: "ngomong" }
            : tujuanKunjungan(visit, dunia.names);
      } else if (semua) {
        tujuan = { kind: "duduk", point: c.id === me.id ? "seat_koordinator_1" : "seat_koordinator_2", clip: "duduk_ngetik" };
      }
      out.push({
        kunci: `k:${c.id}`,
        tipe: c.avatar?.tipe_badan ?? "laki",
        rakitan: rakit(c.avatar, { slug: null, ketua: false, koordinator: true }),
        tujuan,
      });
    }
    return out;
  }, [kelas, koordinator, me, semua, staff, onSelect, kunjungan, jelajah, adegan, dunia]);

  const layar = useMemo(() => {
    const m = new Map<string, string>();
    for (const k of kelas) for (const p of k.room.data) if (p.seat_code) m.set(`${roomKey(k.slug)}_${p.seat_code}`, warnaLayar(p));
    return m;
  }, [kelas]);

  const tampil = semua ? null : utama ? roomKey(utama) : null;
  const box = (tampil && dunia.lantai.get(tampil)) || dunia.bounds;
  const slugDari = (room: string | null) => kelas.find((k) => roomKey(k.slug) === room)?.slug ?? null;

  return (
    <>
      <Gedung dunia={dunia} tampil={tampil} jelajah={!!jelajah} layar={layar} avatars={avatars} />
      <PosisiLabel avatars={avatars} labelEl={props.labelEl} jelajah={!!jelajah} />
      {jelajah ? (
        <Jelajah
          dunia={dunia}
          hitbox={() => [...avatars.current.values()].filter((a) => a.group.visible).map((a) => a.hit)}
          kontrol={props.kontrol}
          onKunci={props.onKunci}
          onBidik={props.onBidik}
          onPintu={props.onPintu}
          onPilih={(kunci) => {
            const [jenis, id] = kunci.split(":");
            if (jenis !== "p") return;
            const k = kelas.find((x) => x.room.data.some((p) => p.user.id === Number(id)));
            if (k) onSelect(Number(id), k.slug);
          }}
          onRuang={(room) => props.onRuang?.(slugDari(room))}
        />
      ) : (
        <Orbit box={box} jauh={semua ? 32 : 18} />
      )}
      {sosok.map((s) => (
        <Avatar
          key={s.kunci}
          kunci={s.kunci}
          gltf={s.tipe === "perempuan" ? perempuan : laki}
          rakitan={s.rakitan}
          graf={dunia.graf}
          pintu={pintu}
          tujuan={s.tujuan}
          selected={selected !== null && s.kunci === `p:${selected}`}
          onPick={s.pick}
          daftar={daftar}
        />
      ))}
    </>
  );
}

function PosisiLabel({
  avatars,
  labelEl,
  jelajah,
}: {
  avatars: RefObject<Map<string, Terdaftar>>;
  labelEl: RefObject<Map<string, HTMLDivElement>>;
  jelajah: boolean;
}) {
  const v = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const [kunci, el] of labelEl.current) {
      const a = avatars.current.get(kunci);
      const jarak = a ? camera.position.distanceTo(a.group.position) : 0;
      if (!a || !a.group.visible || (jelajah && jarak > 8)) {
        el.style.display = "none";
        continue;
      }
      v.copy(a.group.position);
      v.y += 2.05;
      v.project(camera);
      if (v.z > 1) {
        el.style.display = "none";
        continue;
      }
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const skala = Math.min(1.1, Math.max(0.55, 11 / jarak));
      el.style.display = "block";
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${skala})`;
      el.style.zIndex = String(1000 - Math.round(jarak * 10));
      el.dataset.diam = a.diam() ? "1" : "0";
    }
  });
  return null;
}

function Gedung({
  dunia,
  tampil,
  jelajah,
  layar,
  avatars,
}: {
  dunia: Dunia;
  tampil: string | null;
  jelajah: boolean;
  layar: Map<string, string>;
  avatars: RefObject<Map<string, Terdaftar>>;
}) {
  const arah = useMemo(() => new Vector3(), []);

  useEffect(() => {
    // Peserta dan ketua kelas cuma melihat ruangannya; empty induk ruangan lain disembunyikan.
    for (const [key, obj] of dunia.akar) obj.visible = tampil === null || key === tampil;
  }, [dunia, tampil]);

  useEffect(() => {
    for (const [key, m] of dunia.layar) {
      const c = layar.get(key) ?? warnaLayar(undefined);
      m.color.set(c);
      m.emissive.set(c);
      m.emissiveIntensity = 0.7;
    }
  }, [dunia, layar]);

  useFrame(({ camera, controls }, dt) => {
    const target = jelajah ? null : (controls as OrbitImpl | null)?.target;
    if (target) {
      // Dinding yang menghadap kamera disembunyikan, dari arah mata angin di namanya.
      arah.subVectors(camera.position, target);
      const len = Math.hypot(arah.x, arah.z) || 1;
      for (const w of dunia.dinding) w.obj.visible = (arah.x * w.normal.x + arah.z * w.normal.z) / len < 0.3;
    } else for (const w of dunia.dinding) w.obj.visible = true;

    // Pintu membuka sendiri saat ada avatar lewat; di mode Jelajah juga bisa dibuka dengan E.
    for (const p of dunia.pintu) {
      let dekat = false;
      for (const a of avatars.current.values()) {
        if (a.group.visible && Math.hypot(a.group.position.x - p.center.x, a.group.position.z - p.center.z) < 1.4) dekat = true;
      }
      const ke = p.buka || dekat ? 0 : p.tutup;
      p.pivot.rotation.y += (ke - p.pivot.rotation.y) * Math.min(1, dt * 5);
    }
  });

  return <primitive object={dunia.root} />;
}

function Orbit({ box, jauh }: { box: Box3; jauh: number }) {
  const ref = useRef<OrbitImpl>(null);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const c = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const r = Math.max(size.x, size.z);
    c.y = 0;
    camera.position.set(c.x + r * 0.2, r * 0.8, c.z + r * 0.75);
    ref.current?.target.copy(c);
    ref.current?.update();
  }, [box, camera]);

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enableDamping
      minPolarAngle={0.2}
      maxPolarAngle={1.2}
      minDistance={3}
      maxDistance={jauh}
      onChange={() => {
        // Geser kamera tidak boleh keluar gedung.
        const t = ref.current?.target;
        if (!t) return;
        t.x = Math.min(box.max.x, Math.max(box.min.x, t.x));
        t.z = Math.min(box.max.z, Math.max(box.min.z, t.z));
        t.y = 0;
      }}
    />
  );
}

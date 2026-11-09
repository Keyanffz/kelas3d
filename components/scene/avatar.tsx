"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  Bone,
  BufferAttribute,
  BufferGeometry,
  Color,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  type AnimationAction,
  type Group,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import type { GLTF } from "three-stdlib";
import { Gerak, type Badan } from "@/lib/scene/gerak";
import type { Graf } from "@/lib/scene/graf";
import type { Klip, Tujuan } from "@/lib/scene/keadaan";
import { bagianTampil, MATERIAL_WARNA, type Rakitan } from "@/lib/scene/tampilan";

// Satu file avatar dipakai banyak user. Bagian badan menempel kaku ke node tulang tanpa skin.
// Bagian yang tampil digabung jadi satu SkinnedMesh berwarna per vertex, tiap bagian ikut
// tulang induknya dengan bobot penuh, jadi satu avatar cukup satu draw call.
// Semua material avatar sama kecuali warnanya (roughness 0,7, tanpa metal).
export function buatAvatar(gltf: GLTF, r: Rakitan): Object3D {
  const root = clone(gltf.scene);
  root.traverse((o) => {
    const tampil = bagianTampil(r, o.name);
    if (tampil !== null) o.visible = tampil;
  });
  root.updateMatrixWorld(true);

  const tulang: Bone[] = [];
  const semua: Mesh[] = [];
  const tampil = new Set<Object3D>();
  root.traverse((o) => {
    if (o instanceof Bone) tulang.push(o);
    else if (o instanceof Mesh) semua.push(o);
  });
  root.traverseVisible((o) => tampil.add(o));

  const warna = new Color();
  const bagian: BufferGeometry[] = [];
  for (const m of semua) {
    let induk = m.parent;
    while (induk && !(induk instanceof Bone)) induk = induk.parent;
    m.removeFromParent();
    if (!tampil.has(m)) continue;
    const b = induk ? tulang.indexOf(induk) : 0;
    const mat = m.material as MeshStandardMaterial;
    const name = mat.name as (typeof MATERIAL_WARNA)[number];
    if (MATERIAL_WARNA.includes(name)) warna.set(r.warna[name]);
    else warna.copy(mat.color);

    const g = new BufferGeometry()
      .setIndex(m.geometry.index)
      .setAttribute("position", m.geometry.attributes.position.clone())
      .setAttribute("normal", m.geometry.attributes.normal.clone())
      .applyMatrix4(m.matrixWorld);
    const n = g.attributes.position.count;
    const color = new Float32Array(n * 3);
    const skinIndex = new Uint16Array(n * 4);
    const skinWeight = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      warna.toArray(color, i * 3);
      skinIndex[i * 4] = b;
      skinWeight[i * 4] = 1;
    }
    bagian.push(
      g
        .setAttribute("color", new BufferAttribute(color, 3))
        .setAttribute("skinIndex", new BufferAttribute(skinIndex, 4))
        .setAttribute("skinWeight", new BufferAttribute(skinWeight, 4)),
    );
  }

  const bahan = (semua[0].material as MeshStandardMaterial).clone();
  bahan.name = "avatar";
  bahan.color.set("#ffffff");
  bahan.vertexColors = true;
  const mesh = new SkinnedMesh(mergeGeometries(bagian), bahan);
  // Bounding sphere dihitung dari pose diam; pose duduk bisa keluar dari situ.
  mesh.frustumCulled = false;
  root.add(mesh);
  mesh.bind(new Skeleton(tulang));
  return root;
}

// Avatar satu user beserta mixer klipnya; play() dipakai Gerak dan pratinjau.
export function useAvatar(gltf: GLTF, rakitan: Rakitan) {
  // Dirakit ulang cuma kalau isi rakitan berubah, bukan tiap objek baru.
  const kunci = JSON.stringify(rakitan);
  const root = useMemo(() => buatAvatar(gltf, JSON.parse(kunci) as Rakitan), [gltf, kunci]);
  const mixer = useMemo(() => new AnimationMixer(root), [root]);
  const aksi = useMemo(() => new Map(gltf.animations.map((c) => [c.name, mixer.clipAction(c)])), [gltf, mixer]);
  const sekarang = useRef<AnimationAction | null>(null);

  useEffect(
    () => () => {
      mixer.stopAllAction();
      // Strict Mode dan Activity memasang ulang efek dengan root yang sama; tanpa ini play() mengira
      // klip yang sudah dihentikan masih jalan, dan avatar diam di pose dasar.
      sekarang.current = null;
      // Geometri dan bahan dibuat per avatar, jadi dibuang sendiri.
      root.traverse((o) => {
        if (!(o instanceof SkinnedMesh)) return;
        o.geometry.dispose();
        (o.material as MeshStandardMaterial).dispose();
        o.skeleton.dispose();
      });
    },
    [mixer, root],
  );

  const play = useCallback((clip: Klip, { once = false, fade }: { once?: boolean; fade: number }): number => {
    const next = aksi.get(clip);
    if (!next) return 0;
    const prev = sekarang.current;
    if (prev === next && !once) return next.getClip().duration;
    next.reset();
    next.setLoop(once ? LoopOnce : LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.play();
    if (prev && prev !== next) {
      if (fade > 0) prev.crossFadeTo(next, fade, false);
      else prev.stop();
    }
    sekarang.current = next;
    return next.getClip().duration;
  }, [aksi]);

  return { root, mixer, play };
}

export interface AvatarProps {
  kunci: string;
  gltf: GLTF;
  rakitan: Rakitan;
  graf: Graf;
  pintu: string;
  tujuan: Tujuan;
  selected?: boolean;
  onPick?: () => void;
  // Didaftarkan ke scene untuk label, pintu otomatis, dan bidikan mode Jelajah.
  daftar?: (kunci: string, avatar: Terdaftar | null) => void;
}

export interface Terdaftar {
  group: Group;
  hit: Mesh;
  // true kalau sedang tidak berjalan atau berganti pose.
  diam: () => boolean;
}

export function Avatar({ kunci: id, gltf, rakitan, graf, pintu, tujuan, selected, onPick, daftar }: AvatarProps) {
  const { root, mixer, play } = useAvatar(gltf, rakitan);
  const group = useRef<Group>(null);
  const hit = useRef<Mesh>(null);
  const gerak = useRef<Gerak | null>(null);
  const tujuanAwal = useRef(tujuan);
  const playRef = useRef(play);

  useEffect(() => {
    playRef.current = play;
  });

  useEffect(() => {
    const badan: Badan = {
      pose: (x, z, yaw) => {
        group.current?.position.set(x, 0, z);
        if (group.current) group.current.rotation.y = yaw;
      },
      visible: (v) => {
        if (group.current) group.current.visible = v;
      },
      play: (clip, opsi) => playRef.current(clip, opsi),
    };
    gerak.current = new Gerak(graf, pintu, tujuanAwal.current, badan);
    return () => {
      gerak.current = null;
    };
  }, [graf, pintu, root]);

  useEffect(() => {
    tujuanAwal.current = tujuan;
    gerak.current?.setTujuan(tujuan);
  }, [tujuan]);

  useEffect(() => {
    if (group.current && hit.current) daftar?.(id, { group: group.current, hit: hit.current, diam: () => !gerak.current?.sedangJalan });
    return () => daftar?.(id, null);
  }, [daftar, id]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1);
    mixer.update(d);
    const g = gerak.current;
    if (!g) return;
    g.update(d);
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={root} />
      {/* Hitbox tidak digambar; raycast three tetap mengenainya walau visible false. */}
      <mesh
        ref={hit}
        visible={false}
        position={[0, 0.85, 0]}
        userData={{ hitbox: id }}
        onClick={(e) => {
          // Avatar yang sudah pergi (tidak tampil) tidak bisa diklik.
          if (!group.current?.visible) return;
          e.stopPropagation();
          onPick?.();
        }}
        onPointerOver={() => onPick && group.current?.visible && (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <boxGeometry args={[0.6, 1.7, 0.5]} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
          <ringGeometry args={[0.38, 0.48, 32]} />
          <meshBasicMaterial color="#ea580c" />
        </mesh>
      )}
    </group>
  );
}

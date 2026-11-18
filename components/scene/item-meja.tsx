"use client";

import { Vector3 } from "three";
import type { Dunia } from "./dunia";

// Item meja aksesoris di sebelah kanan laptop pemiliknya, sementara dari bentuk dasar sampai asetnya
// dibuat di Blender. `item` memetakan kunci kursi (`developer_a1`) ke id aksesoris.
export function ItemMeja({ dunia, item, tampil }: { dunia: Dunia; item: Map<string, string>; tampil: string | null }) {
  return (
    <>
      {[...item].map(([kursi, id]) => {
        const laptop = dunia.laptop.get(kursi);
        const seat = dunia.graf.titik.get(`seat_${kursi}`);
        const ruang = kursi.slice(0, kursi.lastIndexOf("_"));
        if (!laptop || !seat || (tampil !== null && ruang !== tampil)) return null;
        // Kanan avatar yang duduk menghadap meja (yaw 0 menghadap +z, kiri karakter di +x).
        const p = laptop.getCenter(new Vector3());
        const x = p.x - Math.cos(seat.yaw) * 0.3;
        const z = p.z + Math.sin(seat.yaw) * 0.3;
        return (
          <group key={kursi} position={[x, laptop.min.y, z]} rotation={[0, seat.yaw, 0]}>
            {id === "meja_2" ? <Tanaman /> : <Mug />}
          </group>
        );
      })}
    </>
  );
}

function Mug() {
  return (
    <>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.09, 12]} />
        <meshStandardMaterial color="#f4efe6" roughness={0.7} />
      </mesh>
      <mesh position={[0.045, 0.05, 0]}>
        <boxGeometry args={[0.02, 0.05, 0.015]} />
        <meshStandardMaterial color="#f4efe6" roughness={0.7} />
      </mesh>
    </>
  );
}

function Tanaman() {
  return (
    <>
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.08, 0.07, 0.08]} />
        <meshStandardMaterial color="#b45309" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.11, 0.1, 0.11]} />
        <meshStandardMaterial color="#15803d" roughness={0.7} />
      </mesh>
    </>
  );
}

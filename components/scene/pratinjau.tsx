"use client";

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import type { Rakitan } from "@/lib/scene/tampilan";
import { useAvatar } from "./avatar";

// Pratinjau pemilih avatar: model dan rakitan yang sama dengan scene gedung, berputar pelan.
export default function Pratinjau({ rakitan }: { rakitan: Rakitan }) {
  return (
    <Canvas camera={{ fov: 30, position: [0, 1.4, 4.4] }} dpr={[1, 2]}>
      <color attach="background" args={["#e7dfd0"]} />
      <hemisphereLight args={["#fffaf0", "#9c937f", 1.6]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.8, 48]} />
        <meshStandardMaterial color="#d6ccb8" />
      </mesh>
      <Suspense fallback={null}>
        <Model rakitan={rakitan} />
      </Suspense>
      <OrbitControls target={[0, 0.9, 0]} enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={1.2} minPolarAngle={1} maxPolarAngle={1.6} />
    </Canvas>
  );
}

function Model({ rakitan }: { rakitan: Rakitan }) {
  const gltf = useGLTF(rakitan.tipe === "perempuan" ? "/models/avatar-perempuan.glb" : "/models/avatar-laki.glb");
  const { root, mixer, play } = useAvatar(gltf, rakitan);

  useEffect(() => {
    play("diam", { fade: 0 });
  }, [play]);

  useFrame((_, dt) => mixer.update(Math.min(dt, 0.1)));

  return <primitive object={root} />;
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homePath } from "@/lib/role";
import { useMe } from "./session";

export default function Home() {
  const me = useMe();
  const router = useRouter();
  // Login pertama: pilih tampilan avatar dulu.
  const path = me.avatar ? homePath(me) : "/avatar";

  useEffect(() => {
    if (path) router.replace(path);
  }, [path, router]);

  if (path) return null;
  return (
    <p className="p-6">Kamu belum dimasukkan ke kelas mana pun. Minta ketua kelas menambahkanmu, lalu buka lagi lewat <code className="font-mono">kelas3d buka</code>.</p>
  );
}

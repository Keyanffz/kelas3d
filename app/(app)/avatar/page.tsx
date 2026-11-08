"use client";

import { useRouter } from "next/navigation";
import { PemilihAvatar } from "@/components/pemilih-avatar";
import { api } from "@/lib/api";
import { homePath } from "@/lib/role";
import type { Avatar, Me } from "@/lib/types";
import { useMe, useSetMe } from "../session";

export default function AvatarPage() {
  const me = useMe();
  const setMe = useSetMe();
  const router = useRouter();
  const kelas = me.classrooms[0];

  async function simpan(avatar: Avatar) {
    const r = await api<{ data: Omit<Me, "classrooms"> }>("/api/users/me/avatar", { method: "PATCH", body: avatar });
    const baru = { ...me, ...r.data, classrooms: me.classrooms };
    setMe(baru);
    router.replace(homePath(baru) ?? "/");
  }

  return (
    <main className="flex h-full flex-col">
      <div className="border-b-2 border-tinta px-4 py-3">
        <h1 className="text-lg font-bold">{me.avatar ? "Ubah avatar" : "Pilih tampilan avatarmu"}</h1>
        {!me.avatar && <p className="text-sm text-pudar">Avatar ini yang tampil di gedung kelas. Bisa diubah lagi kapan saja lewat namamu di pojok kanan atas.</p>}
      </div>
      <div className="min-h-0 flex-1">
        <PemilihAvatar
          awal={me.avatar}
          slug={kelas?.slug ?? null}
          ketua={me.classrooms.some((c) => c.role === "admin")}
          koordinator={me.role === "koordinator"}
          simpan={simpan}
          onBatal={me.avatar ? () => router.back() : undefined}
        />
      </div>
    </main>
  );
}

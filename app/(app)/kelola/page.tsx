"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AturanAplikasi } from "@/components/kelola/aturan-aplikasi";
import { KelasJadwal } from "@/components/kelola/kelas-jadwal";
import { Rekap } from "@/components/kelola/rekap";
import { PanelKetua } from "@/components/panel-ketua";
import { PemilihAvatar } from "@/components/pemilih-avatar";
import { api, errorMessage } from "@/lib/api";
import type { Avatar, Classroom, Member } from "@/lib/types";
import { useMe } from "../session";

type Tab = "kelas" | "anggota" | "aturan" | "rekap";
const TABS: { id: Tab; nama: string }[] = [
  { id: "kelas", nama: "Kelas & jadwal" },
  { id: "anggota", nama: "Anggota & ketua" },
  { id: "aturan", nama: "Aturan aplikasi" },
  { id: "rekap", nama: "Rekap aktivitas" },
];

// Dashboard koordinator untuk semua yang bukan pemantauan langsung.
export default function KelolaPage() {
  const me = useMe();
  const router = useRouter();
  const koordinator = me.role === "koordinator";
  const [tab, setTab] = useState<Tab>("kelas");
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kelas, setKelas] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<{ member: Member; slug: string } | null>(null);
  const [versi, setVersi] = useState(0);

  const load = useCallback(
    () =>
      api<{ data: Classroom[] }>("/api/classrooms").then(
        (r) => setClassrooms(r.data),
        (e: unknown) => setError(errorMessage(e)),
      ),
    [],
  );

  useEffect(() => {
    if (!koordinator) router.replace("/");
    else load();
  }, [koordinator, load, router]);

  if (!koordinator) return null;
  if (!classrooms) return <p className="label-mono p-6">{error ?? "Memuat…"}</p>;
  const aktif = kelas ?? classrooms[0]?.slug ?? null;

  async function simpanAvatar(a: Avatar) {
    if (!avatar) return;
    await api(`/api/users/${avatar.member.user.id}/avatar`, { method: "PATCH", body: a });
    setAvatar(null);
    setVersi((v) => v + 1);
  }

  return (
    <main className="mx-auto max-w-6xl p-4">
      <nav className="mb-4 flex flex-wrap border-2 border-tinta bg-kertas">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-r-2 border-tinta px-4 py-2 font-mono text-xs uppercase tracking-wider last:border-r-0 ${tab === t.id ? "bg-tinta text-kertas" : "hover:bg-kertas-tua"}`}
          >
            {t.nama}
          </button>
        ))}
      </nav>

      {tab === "kelas" && <KelasJadwal classrooms={classrooms} onBerubah={load} />}
      {tab === "aturan" && <AturanAplikasi />}
      {tab === "rekap" && <Rekap classrooms={classrooms} />}
      {tab === "anggota" && aktif && (
        <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
          <div className="flex flex-col border-2 border-tinta bg-kertas">
            {classrooms.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setKelas(c.slug)}
                className={`border-b-2 border-tinta px-3 py-2 text-left text-sm last:border-b-0 ${c.slug === aktif ? "bg-tinta text-kertas" : "hover:bg-kertas-tua"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="border-2 border-tinta bg-kertas">
            <p className="border-b-2 border-tinta px-3 py-2 text-sm text-pudar">
              Satu kelas punya satu ketua; menjadikan anggota lain ketua otomatis mengembalikan ketua lama jadi anggota.
            </p>
            <PanelKetua key={`${aktif}-${versi}`} slug={aktif} koordinator onAvatar={(m) => setAvatar({ member: m, slug: aktif })} />
          </div>
        </div>
      )}

      {avatar && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-tinta/50 p-4">
          <div className="flex h-[85vh] w-full max-w-5xl flex-col border-2 border-tinta bg-kertas">
            <p className="border-b-2 border-tinta px-4 py-2 font-bold">Avatar {avatar.member.user.name}</p>
            <div className="min-h-0 flex-1 overflow-auto">
              <PemilihAvatar
                awal={avatar.member.user.avatar}
                slug={avatar.slug}
                ketua={avatar.member.role === "admin"}
                koordinator={false}
                simpan={simpanAvatar}
                onBatal={() => setAvatar(null)}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

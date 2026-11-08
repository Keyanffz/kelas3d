"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DaftarPresence } from "@/components/daftar-presence";
import { DaftarRingkas } from "@/components/daftar-ringkas";
import { DetailPresence } from "@/components/detail-presence";
import { FormPengumuman } from "@/components/form-pengumuman";
import { ToggleMode } from "@/components/toggle-mode";
import { DaftarPengumuman } from "@/components/pengumuman";
import { api, errorMessage } from "@/lib/api";
import type { Classroom } from "@/lib/types";
import { useRooms } from "@/lib/use-rooms";
import { useMe } from "../session";

const Scene = dynamic(() => import("@/components/scene/scene"), {
  ssr: false,
  loading: () => <p className="label-mono p-6">Memuat 3D…</p>,
});

export default function GedungPage() {
  const me = useMe();
  const router = useRouter();
  const koordinator = me.role === "koordinator";
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"3d" | "daftar">("3d");
  const [tab, setTab] = useState<string | null>(null);
  const [pilih, setPilih] = useState<{ id: number; slug: string } | null>(null);
  // undefined: belum memilih di halaman ini, jadi ikut posisi dari API.
  const [kunjunganPilihan, setKunjunganPilihan] = useState<string | null | undefined>(undefined);
  const [jelajah, setJelajah] = useState(false);
  const [formPengumuman, setFormPengumuman] = useState(false);

  useEffect(() => {
    if (!koordinator) {
      router.replace("/");
      return;
    }
    api<{ data: Classroom[] }>("/api/classrooms").then(
      (r) => setClassrooms(r.data),
      (e: unknown) => setError(errorMessage(e)),
    );
  }, [koordinator, router]);

  const slugs = useMemo(() => classrooms?.map((c) => c.slug) ?? [], [classrooms]);
  const { rooms, error: roomError, koordinator: kenal, pengumuman, riwayatPengumuman, tutupPengumuman, adegan, selesaiAdegan } = useRooms(slugs, true);
  const kunjunganData = slugs.find((s) => rooms[s]?.coordinators.some((c) => c.id === me.id)) ?? null;
  const kunjungan = kunjunganPilihan !== undefined ? kunjunganPilihan : kunjunganData;

  // Balon teguran tampil sebentar, lalu koordinator kembali ke titik berdirinya.
  useEffect(() => {
    if (!adegan) return;
    const t = setTimeout(selesaiAdegan, 15000);
    return () => clearTimeout(t);
  }, [adegan, selesaiAdegan]);

  const kunjungi = useCallback(
    async (slug: string | null) => {
      setKunjunganPilihan(slug);
      try {
        await api("/api/coordinator/visit", { method: "POST", body: { classroom: slug } });
      } catch (e) {
        setError(errorMessage(e));
      }
    },
    [],
  );

  const onRuang = useCallback(
    (slug: string | null) => {
      if (slug !== kunjungan) void kunjungi(slug);
    },
    [kunjungan, kunjungi],
  );

  const onSelect = useCallback((id: number, slug: string) => {
    setPilih({ id, slug });
    setTab(slug);
  }, []);

  const kelas = useMemo(() => slugs.filter((s) => rooms[s]).map((s) => ({ slug: s, room: rooms[s] })), [slugs, rooms]);

  if (!koordinator) return null;
  if (!classrooms) return <p className="label-mono p-6">{error ?? "Memuat kelas…"}</p>;

  const active = tab ?? classrooms[0]?.slug ?? null;
  const dipilih = pilih ? rooms[pilih.slug]?.data.find((p) => p.user.id === pilih.id) : undefined;
  const pesan = error ?? roomError;

  return (
    <main className="flex h-full flex-col">
      <div className="relative flex flex-wrap items-center gap-2 border-b-2 border-tinta px-3 py-2">
        <ToggleMode mode={mode} onMode={setMode} />
        <span className="label-mono ml-2">Kunjungi</span>
        {classrooms.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={`tombol ${kunjungan === c.slug ? "bg-oranye text-kertas" : ""}`}
            onClick={() => kunjungi(c.slug)}
            disabled={kunjungan === c.slug}
          >
            {c.name}
          </button>
        ))}
        <button type="button" className="tombol" onClick={() => kunjungi(null)} disabled={kunjungan === null}>
          Ruang koordinator
        </button>
        <div className="ml-auto flex gap-2">
          {mode === "3d" && (
            <button type="button" className="tombol" onClick={() => setJelajah(true)} disabled={jelajah}>
              Jelajah
            </button>
          )}
          <button type="button" className="tombol" onClick={() => setFormPengumuman((v) => !v)}>
            Pengumuman
          </button>
        </div>
        {formPengumuman && <FormPengumuman classrooms={classrooms} riwayat={riwayatPengumuman} onTutup={() => setFormPengumuman(false)} />}
      </div>
      {pesan && <p className="border-b-2 border-tinta bg-white px-4 py-1.5 text-sm text-marun">{pesan}</p>}

      {mode === "daftar" ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <Tabs classrooms={classrooms} active={active} onTab={setTab} />
          {active && rooms[active] ? (
            <DaftarPresence room={rooms[active]} staff onSelect={(p) => onSelect(p.user.id, active)} />
          ) : (
            <p className="label-mono p-4">Memuat presence…</p>
          )}
          {dipilih && pilih && (
            <div className="fixed bottom-4 right-4 z-30 w-[22rem] max-w-[calc(100vw-2rem)] border-2 border-tinta bg-kertas shadow-[4px_4px_0_#1c1917]">
              <DetailPresence p={dipilih} slug={pilih.slug} bisaTegur berkunjung={kunjungan === pilih.slug} onClose={() => setPilih(null)} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative min-h-[55vh] flex-1">
            <Scene
              me={me}
              kelas={kelas}
              koordinator={kenal}
              semua
              staff
              selected={pilih?.id ?? null}
              onSelect={onSelect}
              kunjungan={kunjungan}
              jelajah={jelajah}
              onJelajah={setJelajah}
              onRuang={onRuang}
              adegan={adegan}
            />
            <DaftarPengumuman list={pengumuman} onTutup={tutupPengumuman} />
          </div>
          <aside className="flex max-h-[45vh] flex-col overflow-auto border-t-2 border-tinta bg-kertas lg:max-h-none lg:w-[22rem] lg:border-l-2 lg:border-t-0">
            {dipilih && pilih && (
              <DetailPresence p={dipilih} slug={pilih.slug} bisaTegur berkunjung={kunjungan === pilih.slug} onClose={() => setPilih(null)} />
            )}
            <Tabs classrooms={classrooms} active={active} onTab={setTab} />
            {active && rooms[active] ? (
              <DaftarRingkas room={rooms[active]} selected={pilih?.id ?? null} onSelect={(p) => onSelect(p.user.id, active)} />
            ) : (
              <p className="label-mono p-4">Memuat presence…</p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function Tabs({ classrooms, active, onTab }: { classrooms: Classroom[]; active: string | null; onTab: (slug: string) => void }) {
  return (
    <nav className="flex border-b-2 border-tinta">
      {classrooms.map((c) => (
        <button
          key={c.slug}
          type="button"
          onClick={() => onTab(c.slug)}
          className={`flex-1 border-r-2 border-tinta px-3 py-2 font-mono text-xs uppercase tracking-wider last:border-r-0 ${
            c.slug === active ? "bg-tinta text-kertas" : "hover:bg-kertas-tua"
          }`}
        >
          {c.name}
        </button>
      ))}
    </nav>
  );
}

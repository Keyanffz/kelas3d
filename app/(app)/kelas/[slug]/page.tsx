"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AngkatTangan } from "@/components/angkat-tangan";
import { DaftarPresence } from "@/components/daftar-presence";
import { DetailPresence } from "@/components/detail-presence";
import { PanelKetua } from "@/components/panel-ketua";
import { DaftarPengumuman } from "@/components/pengumuman";
import { ToggleMode } from "@/components/toggle-mode";
import { isStaff } from "@/lib/role";
import { useRooms } from "@/lib/use-rooms";
import { useMe } from "../../session";

const Scene = dynamic(() => import("@/components/scene/scene"), {
  ssr: false,
  loading: () => <p className="label-mono p-6">Memuat 3D…</p>,
});

export default function KelasPage() {
  const { slug } = useParams<{ slug: string }>();
  const me = useMe();
  const kelas = me.classrooms.find((c) => c.slug === slug);
  const staff = isStaff(me, slug);
  const ketua = kelas?.role === "admin";
  const slugs = useMemo(() => [slug], [slug]);
  const { rooms, error, koordinator, muatUlang, pengumuman, tutupPengumuman, teguran, setTeguran, adegan, selesaiAdegan } = useRooms(slugs, staff);
  const room = rooms[slug];
  const [mode, setMode] = useState<"3d" | "daftar">("3d");
  const [panel, setPanel] = useState(ketua);
  const [pilih, setPilih] = useState<number | null>(null);

  useEffect(() => {
    if (!adegan) return;
    const t = setTimeout(selesaiAdegan, 15000);
    return () => clearTimeout(t);
  }, [adegan, selesaiAdegan]);

  const kelasScene = room ? [{ slug, room }] : [];
  const saya = room?.data.find((p) => p.user.id === me.id);
  const dipilih = pilih !== null ? room?.data.find((p) => p.user.id === pilih) : undefined;
  const baruTeguran = teguran.filter((n) => n.status === "terkirim").length;

  return (
    <main className="flex h-full flex-col">
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-tinta px-3 py-2">
        <h1 className="text-lg font-bold">Kelas {kelas?.name ?? slug}</h1>
        {kelas && <span className="label-mono">{kelas.seat_code ? `Kursimu ${kelas.seat_code.toUpperCase()}` : "Belum punya kursi"}</span>}
        <ToggleMode mode={mode} onMode={setMode} />
        <div className="ml-auto flex items-center gap-2">
          {kelas && <AngkatTangan slug={slug} saya={saya} />}
          {ketua && (
            <button type="button" className={`tombol ${panel ? "bg-tinta text-kertas" : ""}`} onClick={() => setPanel((v) => !v)}>
              Panel ketua{baruTeguran > 0 && <span className="ml-1.5 bg-oranye px-1 text-kertas">{baruTeguran}</span>}
            </button>
          )}
        </div>
      </div>
      {error && <p className="border-b-2 border-tinta bg-white px-4 py-1.5 text-sm text-marun">{error}</p>}
      {kelas && !kelas.seat_code && (
        <p className="border-b-2 border-tinta bg-white px-4 py-1.5 text-sm">Avatarmu belum muncul di ruangan karena belum punya kursi. Minta ketua kelas mengatur kursimu.</p>
      )}

      {!room ? (
        <p className="label-mono p-6">{error ?? "Memuat presence…"}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {mode === "3d" ? (
            <div className="relative min-h-[55vh] flex-1">
              <Scene
                me={me}
                kelas={kelasScene}
                koordinator={koordinator}
                semua={false}
                staff={staff}
                selected={pilih}
                onSelect={setPilih}
                adegan={adegan}
              />
              <DaftarPengumuman list={pengumuman} onTutup={tutupPengumuman} />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <DaftarPengumuman list={pengumuman} onTutup={tutupPengumuman} />
              <DaftarPresence room={room} staff={staff} onSelect={staff ? (p) => setPilih(p.user.id) : undefined} />
            </div>
          )}
          {(dipilih || panel) && (
            <aside className="max-h-[50vh] overflow-auto border-t-2 border-tinta bg-kertas lg:max-h-none lg:w-[24rem] lg:border-l-2 lg:border-t-0">
              {dipilih && (
                <DetailPresence p={dipilih} slug={slug} bisaTegur={me.role === "koordinator"} berkunjung={false} onClose={() => setPilih(null)} />
              )}
              {panel && ketua && (
                <PanelKetua slug={slug} koordinator={false} teguran={teguran} setTeguran={setTeguran} onBerubah={() => muatUlang(slug)} />
              )}
            </aside>
          )}
        </div>
      )}
    </main>
  );
}

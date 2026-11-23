"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { RapatProvider } from "@/components/rapat/penyedia";
import { KartuRapat } from "@/components/rapat/kartu";
import { KartuLayar } from "@/components/layar/kartu-layar";
import { LayarProvider } from "@/components/layar/penyedia";
import { api, ApiError, errorMessage } from "@/lib/api";
import { disconnectEcho, useEchoStatus } from "@/lib/echo";
import type { Me } from "@/lib/types";

const MeContext = createContext<Me | null>(null);
const SetMeContext = createContext<(me: Me) => void>(() => undefined);

export function useMe(): Me {
  const me = use(MeContext);
  if (!me) throw new Error("useMe dipakai di luar <Session>");
  return me;
}

// Dipakai pemilih avatar supaya tampilan baru langsung terpakai tanpa memuat ulang /api/me.
export const useSetMe = () => use(SetMeContext);

// Pengaman semua halaman yang butuh login: tanpa sesi diarahkan ke /login.
export function Session({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ data: Me }>("/api/me").then(
      (r) => setMe(r.data),
      (e: unknown) => {
        if (e instanceof ApiError && e.status === 401) router.replace("/login");
        else setError(errorMessage(e));
      },
    );
  }, [router]);

  if (!me) return <p className="label-mono p-6">{error ?? "Memuat…"}</p>;

  return (
    <MeContext value={me}>
      <SetMeContext value={setMe}>
        {/* Tinggi layar penuh: halaman 3D mengisi sisa tinggi, halaman lain bergulir di dalamnya. */}
        <RapatProvider>
          <LayarProvider me={me}>
            <div className="flex h-dvh flex-col">
              <Header me={me} />
              <div className="min-h-0 flex-1 overflow-auto">{children}</div>
            </div>
            <KartuLayar meId={me.id} />
            <KartuRapat />
          </LayarProvider>
        </RapatProvider>
      </SetMeContext>
    </MeContext>
  );
}

const STATUS_LABEL = {
  connected: "Realtime tersambung",
  connecting: "Menyambung realtime…",
  reconnecting: "Menyambung ulang…",
  disconnected: "Realtime putus",
  failed: "Realtime gagal",
} as const;

function Header({ me }: { me: Me }) {
  const router = useRouter();
  const status = useEchoStatus();
  const ketua = me.classrooms.some((c) => c.role === "admin");

  async function logout() {
    await api("/api/logout", { method: "POST" }).catch(() => undefined);
    disconnectEcho();
    router.replace("/login");
  }

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-2 border-tinta bg-kertas px-4 py-2">
      <Link href="/" className="font-mono text-sm font-bold uppercase tracking-widest">
        Kelas 3D <span className="font-normal text-pudar">· Bengkel Koding</span>
      </Link>
      <span className="label-mono flex items-center gap-2">
        <span className={`size-2 ${status === "connected" ? "bg-hijau" : "bg-oranye"}`} />
        {STATUS_LABEL[status]}
      </span>
      {me.role === "koordinator" && (
        <nav className="flex gap-1 font-mono text-xs uppercase tracking-wider">
          <Link href="/gedung" className="px-2 py-1 hover:bg-kertas-tua">Gedung</Link>
          <Link href="/kelola" className="px-2 py-1 hover:bg-kertas-tua">Kelola</Link>
        </nav>
      )}
      {me.role === "peserta" && (
        <nav className="flex gap-1 font-mono text-xs uppercase tracking-wider">
          {me.classrooms[0] && <Link href={`/kelas/${me.classrooms[0].slug}`} className="px-2 py-1 hover:bg-kertas-tua">Kelas</Link>}
          <Link href="/progres" className="px-2 py-1 hover:bg-kertas-tua">Progresku</Link>
        </nav>
      )}
      <div className="ml-auto flex items-center gap-3">
        <Link href="/avatar" className="text-sm underline-offset-4 hover:underline" title="Ubah avatar">
          {me.name}
        </Link>
        {me.role === "koordinator" ? (
          <span className="tag text-oranye">Koordinator</span>
        ) : ketua ? (
          <span className="tag text-marun">Ketua Kelas</span>
        ) : null}
        <button type="button" className="tombol" onClick={logout}>
          Keluar
        </button>
      </div>
    </header>
  );
}

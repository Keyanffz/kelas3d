"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, errorMessage } from "@/lib/api";
import { getEcho } from "@/lib/echo";
import { applySesi, sesiAktif } from "@/lib/layar";
import type { Me, ScreenSession } from "@/lib/types";
import { ambilLayar, bisaBagiLayar, buatPeer, type Peer, type Sinyal } from "@/lib/webrtc";

type Aksi = "setujui" | "tolak" | "izinkan" | "mulai" | "stop";
type Putus = "izin_browser" | "terputus";
type Anggota = { id: number };

// Sambungan realtime yang putus sebentar tidak langsung mengakhiri sesi.
const TENGGANG = 8000;

interface Nilai {
  // Sesi yang melibatkan saya: yang berjalan, dan yang baru berakhir sampai kartunya ditutup.
  sesi: ScreenSession[];
  // Layar yang sedang saya tonton, per id sesi.
  streams: ReadonlyMap<number, MediaStream>;
  pesan: string | null;
  // Melempar ApiError kalau ditolak server, supaya form peminta bisa menampilkan alasannya.
  minta: (classroom: string, targetId: number, reason: string | null) => Promise<void>;
  aksi: (id: number, action: Aksi, reason?: Putus) => Promise<boolean>;
  // Mahasiswa mengizinkan: browser membuka pemilih layar, lalu stream dikirim ke koordinator.
  izinkan: (s: ScreenSession) => Promise<void>;
  // Mahasiswa sendiri membagikan layar ke yang menangani bantuannya.
  bagikan: (helpId: number) => Promise<void>;
  buang: (id: number) => void;
}

const LayarContext = createContext<Nilai | null>(null);

export function useLayar(): Nilai {
  const nilai = use(LayarContext);
  if (!nilai) throw new Error("useLayar dipakai di luar <LayarProvider>");
  return nilai;
}

// State lihat layar untuk seluruh halaman yang butuh login: daftar sesi dari REST dan event di channel
// pribadi, plus koneksi WebRTC-nya. Dipasang di Session supaya prompt muncul di halaman mana pun.
export function LayarProvider({ me, children }: { me: Me; children: ReactNode }) {
  const [sesi, setSesi] = useState<ScreenSession[]>([]);
  const [streams, setStreams] = useState<ReadonlyMap<number, MediaStream>>(new Map());
  const [pesan, setPesan] = useState<string | null>(null);
  const ice = useRef<RTCIceServer[]>([]);
  // Cara menutup koneksi tiap sesi yang sedang saya tonton atau bagikan.
  const koneksi = useRef(new Map<number, () => void>());

  const terima = useCallback((s: ScreenSession) => setSesi((all) => applySesi(all, s)), []);

  const kirim = useCallback(
    async (id: number, action: Aksi, reason?: Putus, senyap = false): Promise<boolean> => {
      try {
        const r = await api<{ data: ScreenSession }>(`/api/screen-sessions/${id}`, { method: "PATCH", body: { action, reason } });
        terima(r.data);
        if (!senyap) setPesan(null);
        return true;
      } catch (e) {
        if (!senyap) setPesan(errorMessage(e));
        return false;
      }
    },
    [terima],
  );

  useEffect(() => {
    let alive = true;
    const echo = getEcho();
    const name = `user.${me.id}`;
    const muat = () =>
      api<{ data: ScreenSession[]; ice_servers: RTCIceServer[] }>("/api/screen-sessions").then(
        (r) => {
          if (!alive) return;
          ice.current = r.ice_servers;
          // Sesi berjalan mengikuti server; kartu sesi yang sudah berakhir tetap ada sampai ditutup.
          setSesi((all) => [...r.data, ...all.filter((s) => !sesiAktif(s) && !r.data.some((x) => x.id === s.id))]);
          // Halaman dimuat ulang di tengah sesi: stream-nya sudah hilang dan tidak bisa diambil lagi tanpa klik.
          for (const s of r.data) {
            if (s.target.id === me.id && (s.status === "menyambung" || s.status === "live") && !koneksi.current.has(s.id)) {
              void kirim(s.id, "stop", "terputus", true);
            }
          }
        },
        () => undefined,
      );

    // Channel ini juga yang membuat server tahu web saya sedang terbuka.
    echo
      .private(name)
      .subscribed(muat)
      .listen(".ScreenSessionChanged", (e: ScreenSession) => alive && terima(e));
    muat();

    return () => {
      alive = false;
      echo.leave(name);
    };
  }, [me.id, terima, kirim]);

  const tonton = useCallback(
    (s: ScreenSession) => {
      const echo = getEcho();
      const name = `screen.${s.id}`;
      const ch = echo.join(name);
      let peer: Peer | null = null;
      let putus: ReturnType<typeof setTimeout> | undefined;

      ch.listenForWhisper("sinyal", (x: Sinyal) => {
        // Tawaran baru berarti mahasiswa menyambung dari awal, jadi koneksi lama dibuang.
        if (x.desc?.type === "offer") {
          peer?.tutup();
          peer = buatPeer({
            ice: ice.current,
            kirim: (y) => ch.whisper("sinyal", y),
            onStream: (stream) => setStreams((m) => new Map(m).set(s.id, stream)),
            onStatus: (status) => {
              if (status === "failed") void kirim(s.id, "stop", "terputus", true);
            },
          });
        }
        void peer?.terima(x);
      });
      ch.joining((u: Anggota) => {
        if (u.id === s.target.id) clearTimeout(putus);
      });
      ch.leaving((u: Anggota) => {
        if (u.id === s.target.id) putus = setTimeout(() => void kirim(s.id, "stop", "terputus", true), TENGGANG);
      });

      return () => {
        clearTimeout(putus);
        peer?.tutup();
        echo.leave(name);
        setStreams((m) => {
          const next = new Map(m);
          next.delete(s.id);
          return next;
        });
      };
    },
    [kirim],
  );

  useEffect(() => {
    const k = koneksi.current;
    for (const [id, tutup] of k) {
      if (sesi.some((s) => s.id === id && sesiAktif(s))) continue;
      tutup();
      k.delete(id);
    }
    for (const s of sesi) {
      if (k.has(s.id) || (s.status !== "menyambung" && s.status !== "live")) continue;
      if (s.viewer.id === me.id) k.set(s.id, tonton(s));
    }
  }, [sesi, me.id, tonton]);

  useEffect(() => {
    const k = koneksi.current;
    return () => {
      for (const tutup of k.values()) tutup();
      k.clear();
    };
  }, []);

  // Pemilih layar dibuka langsung dari klik; null kalau browser tidak mendukung atau mahasiswa membatalkan.
  const pilihLayar = useCallback(async (): Promise<MediaStream | null> => {
    if (!bisaBagiLayar()) {
      setPesan("Browser cuma mengizinkan berbagi layar di https atau localhost. Buka web lewat alamat yang aman, lalu coba lagi.");
      return null;
    }
    try {
      return await ambilLayar();
    } catch {
      setPesan("Layar tidak jadi dibagikan: pemilih layar ditutup atau izin browser ditolak.");
      return null;
    }
  }, []);

  // Mengirim stream ke penonton sesi itu lewat channel signaling-nya.
  const siarkan = useCallback(
    (s: ScreenSession, stream: MediaStream) => {
      const echo = getEcho();
      const name = `screen.${s.id}`;
      const ch = echo.join(name);
      let peer: Peer | null = null;
      let putus: ReturnType<typeof setTimeout> | undefined;

      // Tiap penonton muncul di channel, tawaran dikirim dari koneksi baru.
      const sambung = () => {
        clearTimeout(putus);
        peer?.tutup();
        peer = buatPeer({
          ice: ice.current,
          stream,
          kirim: (y) => ch.whisper("sinyal", y),
          onStatus: (status) => {
            if (status === "connected") void kirim(s.id, "mulai", undefined, true);
            if (status === "failed") void kirim(s.id, "stop", "terputus", true);
          },
        });
        void peer.tawar();
      };

      ch.listenForWhisper("sinyal", (x: Sinyal) => void peer?.terima(x));
      ch.here((users: Anggota[]) => {
        if (users.some((u) => u.id === s.viewer.id)) sambung();
      });
      ch.joining((u: Anggota) => {
        if (u.id === s.viewer.id) sambung();
      });
      ch.leaving((u: Anggota) => {
        if (u.id === s.viewer.id) putus = setTimeout(() => void kirim(s.id, "stop", "terputus", true), TENGGANG);
      });
      // Tombol "Berhenti berbagi" milik browser.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => void kirim(s.id, "stop", undefined, true));

      koneksi.current.set(s.id, () => {
        clearTimeout(putus);
        peer?.tutup();
        stream.getTracks().forEach((t) => t.stop());
        echo.leave(name);
      });
    },
    [kirim],
  );

  const izinkan = useCallback(
    async (s: ScreenSession) => {
      const stream = await pilihLayar();
      if (!stream) {
        await kirim(s.id, "stop", "izin_browser", true);
        return;
      }

      const lepas = () => stream.getTracks().forEach((t) => t.stop());
      koneksi.current.set(s.id, lepas);
      if (!(await kirim(s.id, "izinkan"))) {
        koneksi.current.delete(s.id);
        lepas();
        return;
      }
      siarkan(s, stream);
    },
    [kirim, pilihLayar, siarkan],
  );

  const bagikan = useCallback(
    async (helpId: number) => {
      const stream = await pilihLayar();
      if (!stream) return;

      try {
        const r = await api<{ data: ScreenSession }>(`/api/help-requests/${helpId}/screen-session`, { method: "POST" });
        // Didaftarkan sebelum sesi masuk state, supaya efek penutup tidak menganggapnya halaman yang dimuat ulang.
        siarkan(r.data, stream);
        terima(r.data);
        setPesan(null);
      } catch (e) {
        stream.getTracks().forEach((t) => t.stop());
        setPesan(errorMessage(e));
      }
    },
    [pilihLayar, siarkan, terima],
  );

  const minta = useCallback(
    async (classroom: string, targetId: number, reason: string | null) => {
      const r = await api<{ data: ScreenSession }>("/api/screen-sessions", {
        method: "POST",
        body: { classroom, target_user_id: targetId, reason },
      });
      terima(r.data);
    },
    [terima],
  );

  const aksi = useCallback((id: number, action: Aksi, reason?: Putus) => kirim(id, action, reason), [kirim]);
  const buang = useCallback((id: number) => setSesi((all) => all.filter((s) => s.id !== id)), []);
  const nilai = useMemo(() => ({ sesi, streams, pesan, minta, aksi, izinkan, bagikan, buang }), [sesi, streams, pesan, minta, aksi, izinkan, bagikan, buang]);

  return <LayarContext value={nilai}>{children}</LayarContext>;
}

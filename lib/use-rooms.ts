"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./api";
import { getEcho } from "./echo";
import { applyAnnouncements, applyCoordinatorMoved, applyHelpRequested, applyNudge, applyPresenceChanged } from "./presence";
import type {
  AnnouncementSentEvent,
  Coordinator,
  CoordinatorMovedEvent,
  HelpRequestedEvent,
  Nudge,
  NudgeSentEvent,
  PresenceChangedEvent,
  PresenceList,
} from "./types";

export type Pengumuman = AnnouncementSentEvent & { classroom: string };
export type Teguran = NudgeSentEvent & { classroom: string };

// Presence beberapa kelas sekaligus: keadaan awal dari REST, lalu diperbarui event di channel tiap kelas.
// `staff` (koordinator atau ketua kelas) ikut mendengar channel staf untuk teguran.
export function useRooms(slugs: string[], staff: boolean) {
  const [rooms, setRooms] = useState<Record<string, PresenceList>>({});
  const [error, setError] = useState<string | null>(null);
  // Pengumuman hari ini, terbaru dulu. Yang ditutup cuma disembunyikan dari banner, jadi tidak muncul lagi
  // saat daftar dimuat ulang, dan tetap ada di riwayat koordinator.
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [ditutup, setDitutup] = useState<ReadonlySet<number>>(new Set());
  const [teguran, setTeguran] = useState<Teguran[]>([]);
  // Teguran yang baru dikirim selama halaman terbuka; dipakai adegan koordinator ke meja ketua kelas.
  const [adegan, setAdegan] = useState<Teguran | null>(null);
  // Semua koordinator yang pernah terlihat, supaya avatarnya bisa berjalan keluar sesudah selesai berkunjung.
  const [kenal, setKenal] = useState<Coordinator[]>([]);
  const loadRef = useRef<(slug: string) => void>(() => undefined);
  const key = slugs.join(",");

  useEffect(() => {
    const list = key ? key.split(",") : [];
    let alive = true;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const echo = getEcho();
    const patch = (slug: string, fn: (r: PresenceList) => PresenceList) =>
      setRooms((all) => (all[slug] ? { ...all, [slug]: fn(all[slug]) } : all));
    const kenalkan = (list: Coordinator[]) =>
      setKenal((all) => [...all.filter((c) => !list.some((x) => x.id === c.id)), ...list]);

    const load = (slug: string) =>
      api<PresenceList>(`/api/classrooms/${slug}/presences`).then(
        (data) => {
          if (!alive) return;
          setRooms((all) => ({ ...all, [slug]: data }));
          kenalkan(data.coordinators);
          setError(null);
        },
        (e: unknown) => alive && setError(errorMessage(e)),
      );
    loadRef.current = load;

    const muatPengumuman = (slug: string) =>
      api<{ data: AnnouncementSentEvent[] }>(`/api/classrooms/${slug}/announcements`).then(
        (r) => alive && setPengumuman((all) => applyAnnouncements(all, r.data.map((a) => ({ ...a, classroom: slug })))),
        () => undefined,
      );

    if (staff && list.length) {
      api<{ data: Nudge[] }>("/api/nudges").then(
        (r) => alive && setTeguran(r.data.filter((n) => list.includes(n.classroom))),
        () => undefined,
      );
    }

    for (const slug of list) {
      load(slug);
      muatPengumuman(slug);
      const name = `classroom.${slug}`;
      echo
        .private(name)
        // Event yang lewat sebelum berlangganan atau saat koneksi putus tidak dikirim ulang,
        // jadi muat ulang tiap langganan berhasil (termasuk sesudah tersambung lagi).
        .subscribed(() => {
          load(slug);
          muatPengumuman(slug);
        })
        .listen(".PresenceChanged", (e: PresenceChangedEvent) => {
          patch(slug, (r) => ({ ...r, data: applyPresenceChanged(r.data, e) }));
          // Event tidak membawa project dan file, jadi staf mengambil ulang detailnya sesudah event mereda.
          if (staff) {
            clearTimeout(timers.get(slug));
            timers.set(slug, setTimeout(() => load(slug), 1500));
          }
        })
        .listen(".HelpRequested", (e: HelpRequestedEvent) => {
          patch(slug, (r) => ({ ...r, data: applyHelpRequested(r.data, e) }));
        })
        .listen(".CoordinatorMoved", (e: CoordinatorMovedEvent) => {
          patch(slug, (r) => ({ ...r, coordinators: applyCoordinatorMoved(r.coordinators, slug, e) }));
          kenalkan([e.coordinator]);
        })
        .listen(".AnnouncementSent", (e: AnnouncementSentEvent) => {
          setPengumuman((all) => applyAnnouncements(all, [{ ...e, classroom: slug }]));
        })
        .error(() => alive && setError("Tidak boleh mendengar channel kelas ini."));

      if (staff) {
        echo.private(`${name}.staff`).listen(".NudgeSent", (e: NudgeSentEvent) => {
          const t = { ...e, classroom: slug };
          setTeguran((all) => applyNudge(all, t));
          if (e.status === "terkirim") setAdegan(t);
        });
      }
    }

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      for (const slug of list) {
        echo.leave(`classroom.${slug}`);
        if (staff) echo.leave(`classroom.${slug}.staff`);
      }
    };
  }, [key, staff]);

  const muatUlang = useCallback((slug: string) => loadRef.current(slug), []);
  const tutupPengumuman = useCallback((id: number) => setDitutup((s) => new Set(s).add(id)), []);
  const selesaiAdegan = useCallback(() => setAdegan(null), []);

  return {
    rooms,
    error,
    koordinator: kenal,
    // Muat ulang presence satu kelas, misalnya sesudah anggota atau kursi berubah.
    muatUlang,
    // Untuk banner: pengumuman hari ini yang belum ditutup.
    pengumuman: pengumuman.filter((a) => !ditutup.has(a.id)),
    // Semua pengumuman hari ini, termasuk yang ditutup.
    riwayatPengumuman: pengumuman,
    tutupPengumuman,
    teguran,
    setTeguran,
    adegan,
    selesaiAdegan,
  };
}

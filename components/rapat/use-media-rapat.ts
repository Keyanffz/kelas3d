"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room, Track } from "livekit-client";
import { tampilanMedia } from "@/lib/rapat";
import type { Avatar } from "@/lib/types";
import { api, ApiError } from "@/lib/api";

export type Perangkat = "mic" | "kamera" | "layar";
export interface OrangMedia {
  id: string;
  nama: string;
  slot?: number;
  avatar?: Avatar;
  lokal: boolean;
  mic: boolean;
  bicara: boolean;
  video?: Track;
  layar?: Track;
  audio: Track[];
}
interface Media {
  id: number;
  status: "menyambung" | "tersambung" | "terputus";
  orang: OrangMedia[];
  perluKlik: boolean;
  pesan?: string;
}

function pesanPerangkat(e: unknown, alat: Perangkat) {
  if (e instanceof Error && ["NotAllowedError", "PermissionDeniedError"].includes(e.name))
    return `Izin ${alat} ditolak atau pemilihan dibatalkan. Izinkan di browser untuk mencoba lagi.`;
  if (e instanceof Error && e.name === "NotFoundError") return `Perangkat ${alat} tidak ditemukan.`;
  return `Gagal mengubah ${alat}. Periksa perangkat dan izin browser.`;
}

export function useMediaRapat(id: number | null, bolehMulai: boolean) {
  const room = useRef<Room | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const mulai = useRef<(() => void) | null>(null);
  const [percobaan, ulang] = useState(0);
  const [state, setState] = useState<Media | null>(null);
  const [alatSibuk, setAlatSibuk] = useState<Perangkat | null>(null);
  const menunggu = useRef<Room | null>(null);

  const bukaAudio = useCallback(() => {
    if (room.current) {
      void room.current.startAudio().catch(() => undefined);
    } else if (typeof AudioContext !== "undefined") {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume().catch(() => undefined);
      } catch {
        // Browser dapat meminta klik kedua lewat tombol Aktifkan suara.
      }
    }
  }, []);
  const lepasAudio = useCallback(() => {
    const ctx = audio.current;
    audio.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close().catch(() => undefined);
  }, []);
  useEffect(() => {
    if (id === null) return;
    let aktif = true;
    let memulai = false;
    let r: Room | null = null;
    const awal: Media = { id, status: "menyambung", orang: [], perluKlik: false };
    mulai.current = async () => {
      if (memulai) return;
      memulai = true;
      setState(awal);
      try {
        const [{ Room, RoomEvent, Track }, { data }] = await Promise.all([
          import("livekit-client"), api<{ data: { token: string; url: string } }>(`/api/meetings/${id}/token`, { method: "POST" }),
        ]);
        if (!aktif) return;
        const sesi = new Room({ adaptiveStream: true, dynacast: true, webAudioMix: audio.current ? { audioContext: audio.current } : true });
        r = room.current = sesi;
        const tampil = () => {
          if (!aktif) return;
          const orang = [sesi.localParticipant, ...sesi.remoteParticipants.values()].map((p): OrangMedia => ({
            ...tampilanMedia(p.metadata), id: p.identity, nama: p.name || p.identity, lokal: p === sesi.localParticipant,
            mic: p.isMicrophoneEnabled, bicara: sesi.activeSpeakers.some((s) => s.identity === p.identity),
            video: p.isCameraEnabled ? p.getTrackPublication(Track.Source.Camera)?.track : undefined,
            layar: p.isScreenShareEnabled ? p.getTrackPublication(Track.Source.ScreenShare)?.track : undefined,
            audio: p === sesi.localParticipant ? [] : [...p.audioTrackPublications.values()].flatMap((pub) => pub.track ? [pub.track] : []),
          }));
          setState((old) => ({ id, pesan: old?.id === id && old.status === "tersambung" ? old.pesan : undefined, status: sesi.state === "connected" ? "tersambung" : sesi.state === "disconnected" ? "terputus" : "menyambung", orang, perluKlik: !sesi.canPlaybackAudio }));
        };
        sesi.on(RoomEvent.ConnectionStateChanged, tampil).on(RoomEvent.ParticipantConnected, tampil)
          .on(RoomEvent.ParticipantDisconnected, tampil).on(RoomEvent.TrackSubscribed, tampil).on(RoomEvent.TrackUnsubscribed, tampil)
          .on(RoomEvent.LocalTrackPublished, tampil).on(RoomEvent.LocalTrackUnpublished, tampil)
          .on(RoomEvent.TrackMuted, tampil).on(RoomEvent.TrackUnmuted, tampil)
          .on(RoomEvent.ActiveSpeakersChanged, tampil).on(RoomEvent.AudioPlaybackStatusChanged, tampil);
        await sesi.connect(data.url, data.token);
        if (aktif) tampil();
        else await sesi.disconnect();
      } catch (e) {
        if (aktif) setState({ ...awal, status: "terputus", pesan: e instanceof ApiError && e.status === 503 ? "Media belum tersedia. Rapat dan kursi tetap bisa dipakai." : "Sambungan media gagal. Coba sambungkan lagi." });
      }
    };
    return () => {
      aktif = false;
      mulai.current = null;
      room.current = null;
      menunggu.current = null;
      if (r) void r.disconnect().finally(() => r?.removeAllListeners());
      lepasAudio();
    };
  }, [id, percobaan, lepasAudio]);
  useEffect(() => { if (bolehMulai) mulai.current?.(); }, [id, bolehMulai, percobaan]);
  useEffect(() => () => lepasAudio(), [lepasAudio]);

  async function toggle(alat: Perangkat) {
    const r = room.current;
    if (!r || r.state !== "connected" || menunggu.current) return;
    const pesan = (text: string) => setState((s) => s && room.current === r ? { ...s, pesan: text } : s);
    const p = r.localParticipant;
    if (!window.isSecureContext || !navigator.mediaDevices) return pesan("Mic, kamera, dan berbagi layar memerlukan HTTPS atau localhost.");
    menunggu.current = r;
    setAlatSibuk(alat);
    try {
      const pub = alat === "mic" ? await p.setMicrophoneEnabled(!p.isMicrophoneEnabled)
        : alat === "kamera" ? await p.setCameraEnabled(!p.isCameraEnabled)
        : await p.setScreenShareEnabled(!p.isScreenShareEnabled, { audio: true });
      if (r !== room.current) pub?.track?.stop();
      else pesan("");
    } catch (e) {
      pesan(pesanPerangkat(e, alat));
    } finally {
      if (menunggu.current === r) menunggu.current = null;
      setAlatSibuk(null);
    }
  }
  return { media: state?.id === id ? state : null, toggle, alatSibuk, bukaAudio, lepasAudio, ulang: () => ulang((i) => i + 1) };
}

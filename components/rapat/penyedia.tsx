"use client";

import { createContext, use, useCallback, useRef, useState, type ReactNode } from "react";
import { api, errorMessage, ApiError } from "@/lib/api";
import { useMediaRapat } from "./use-media-rapat";
import { gabungRapat, type Rapat } from "@/lib/rapat";

function useStateRapat() {
  const [snapshot, setSnapshot] = useState<Rapat | null>(null);
  const [kursiScene, laporKursi] = useState<string | null | undefined>(undefined);
  const [siap, setSiap] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const versi = useRef(0);
  const proses = useRef(false);
  const terima = useCallback((r: Rapat) => {
    versi.current++;
    setSnapshot((old) => gabungRapat(old, r));
    setSiap(true);
  }, []);
  const muat = useCallback(async () => {
    const mulai = ++versi.current;
    try {
      const { data } = await api<{ data: Rapat | null }>("/api/meetings/current");
      if (mulai === versi.current) {
        setSnapshot(data);
        setSiap(true);
        setPesan(null);
      }
    } catch (e) {
      if (mulai === versi.current) setPesan(errorMessage(e));
    }
  }, []);
  const kirim = useCallback(async (path: string, method: "POST" | "PATCH", body?: unknown) => {
    if (proses.current) return false;
    proses.current = true;
    setSibuk(true);
    setPesan(null);
    const mulai = versi.current;
    try {
      const { data } = await api<{ data: Rapat }>(path, { method, body });
      if (mulai === versi.current) terima(data);
      else await muat();
      return true;
    } catch (e) {
      await muat();
      setPesan(e instanceof ApiError && e.body?.errors ? Object.values(e.body.errors).flat()[0] : errorMessage(e));
      return false;
    } finally {
      proses.current = false;
      setSibuk(false);
    }
  }, [terima, muat]);
  const sendiri = snapshot?.status === "aktif" && snapshot.self?.status === "hadir" ? snapshot.self : null;
  const media = useMediaRapat(sendiri && snapshot ? snapshot.id : null, !!sendiri && (kursiScene === undefined || kursiScene === `seat_${sendiri.seat}`));
  return { ...media, kursiScene, laporKursi, rapat: snapshot?.status === "aktif" ? snapshot : null, siap, pesan, sibuk, terima, muat, kirim };
}
const Konteks = createContext<ReturnType<typeof useStateRapat> | null>(null);
export function useRapat() {
  const ctx = use(Konteks);
  if (!ctx) throw new Error("RapatProvider diperlukan");
  return ctx;
}
export function RapatProvider({ children }: { children: ReactNode }) {
  const state = useStateRapat();
  return <Konteks value={state}>{children}</Konteks>;
}

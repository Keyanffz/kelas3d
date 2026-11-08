import type {
  Activity,
  CoordinatorMovedEvent,
  HelpRequestedEvent,
  HelpStatus,
  Coordinator,
  NudgeSentEvent,
  Presence,
  PresenceChangedEvent,
  PresenceState,
  StateReason,
} from "./types";

export const STATE_LABEL: Record<PresenceState, string> = {
  di_kelas: "Di kelas",
  istirahat: "Istirahat",
  keluar: "Keluar",
};

export const REASON_LABEL: Record<StateReason, string> = {
  idle: "idle",
  terputus: "terputus",
  jadwal_istirahat: "jam istirahat",
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  ngoding: "Ngoding",
  vibe_coding: "Vibe coding",
  ngolah_data: "Ngolah data",
  browsing: "Browsing",
  main_game: "Main game",
  lainnya: "Lainnya",
};

export const HELP_LABEL: Record<HelpStatus, string> = {
  menunggu: "Angkat tangan",
  ditangani: "Sedang dibantu",
  selesai: "Selesai",
};

export function applyPresenceChanged(list: Presence[], e: PresenceChangedEvent): Presence[] {
  return list.map((p) => {
    if (p.user.id !== e.user_id) return p;
    const next: Presence = {
      ...p,
      state: e.state,
      state_reason: e.state_reason,
      activity: e.activity,
      app_label: e.app_label,
      state_since: e.state_since,
    };
    // Server mengosongkan detail kerjaan saat keluar; event tidak membawanya, jadi ikut dikosongkan di sini.
    if (e.state === "keluar" && "project" in p) {
      next.project = null;
      next.file_name = null;
      next.language = null;
    }
    return next;
  });
}

export function applyHelpRequested(list: Presence[], e: HelpRequestedEvent): Presence[] {
  return list.map((p) =>
    p.user.id !== e.user.id
      ? p
      : { ...p, help_request: e.status === "selesai" ? null : { id: e.id, note: e.note, status: e.status } },
  );
}

// Koordinator yang berkunjung: masuk daftar kelas tujuan, keluar dari daftar kelas asal.
export function applyCoordinatorMoved(list: Coordinator[], slug: string, e: CoordinatorMovedEvent): Coordinator[] {
  const others = list.filter((c) => c.id !== e.coordinator.id);
  return e.to === slug ? [...others, e.coordinator] : others;
}

// Pengumuman dari REST dan event digabung tanpa dobel, terbaru dulu. Pengumuman untuk semua kelas
// datang dari tiap kelas, dan bisa datang dari REST sekaligus event.
export function applyAnnouncements<T extends { id: number }>(list: T[], baru: T[]): T[] {
  const byId = new Map(list.map((a) => [a.id, a]));
  for (const a of baru) if (!byId.has(a.id)) byId.set(a.id, a);
  return [...byId.values()].sort((a, b) => b.id - a.id);
}

// Teguran yang belum selesai, terbaru dulu. Yang selesai dibuang dari daftar.
export function applyNudge<T extends NudgeSentEvent>(list: T[], e: T): T[] {
  const others = list.filter((n) => n.id !== e.id);
  return e.status === "selesai" ? others : [e, ...others].sort((a, b) => b.id - a.id);
}

// Tulisan keadaan singkat di label avatar dan daftar.
export function subAktivitas(p: Presence): string {
  if (p.state === "keluar") return "Keluar";
  if (p.state === "istirahat") return `Istirahat${p.state_reason ? ` · ${REASON_LABEL[p.state_reason]}` : ""}`;
  return p.activity ? ACTIVITY_LABEL[p.activity] : "Di kelas";
}

export function countByState(list: Presence[]): Record<PresenceState, number> {
  const count = { di_kelas: 0, istirahat: 0, keluar: 0 };
  for (const p of list) count[p.state]++;
  return count;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes < 1) return "< 1 mnt";
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} j ${minutes % 60} mnt` : `${hours} j`;
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
}

"use client";

import { useSyncExternalStore } from "react";
import { ACTIVITY_LABEL, countByState, formatClock, formatDuration, HELP_LABEL, REASON_LABEL, STATE_LABEL } from "@/lib/presence";
import type { Presence, PresenceList, PresenceState } from "@/lib/types";

const TICK = 15_000;
const subscribeClock = (onTick: () => void) => {
  const id = setInterval(onTick, TICK);
  return () => clearInterval(id);
};
const readClock = () => Math.floor(Date.now() / TICK) * TICK;

export function useNow(): number {
  return useSyncExternalStore(subscribeClock, readClock, () => 0);
}

export const STATE_COLOR: Record<PresenceState, string> = {
  di_kelas: "bg-hijau",
  istirahat: "bg-kuning",
  keluar: "bg-pudar",
};

export function lama(p: Presence, now: number): string {
  const since = p.state_since && p.state !== "keluar" ? p.state_since : null;
  return since && now ? formatDuration((now - new Date(since).getTime()) / 1000) : "—";
}

export function DaftarPresence({
  room,
  staff,
  onSelect,
}: {
  room: PresenceList;
  staff: boolean;
  onSelect?: (p: Presence) => void;
}) {
  const now = useNow();

  const count = countByState(room.data);
  return (
    <section>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b-2 border-tinta px-4 py-2 font-mono text-sm">
        <span>{room.data.length} anggota</span>
        {(Object.keys(count) as PresenceState[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`size-2.5 ${STATE_COLOR[s]}`} />
            {count[s]} {STATE_LABEL[s].toLowerCase()}
          </span>
        ))}
        {room.coordinators.length > 0 && (
          <span className="tag text-oranye">Dikunjungi {room.coordinators.map((c) => c.name).join(", ")}</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead>
            <tr className="label-mono border-b-2 border-tinta [&>th]:px-3 [&>th]:py-2 [&>th]:font-normal">
              <th>Kursi</th>
              <th>Nama</th>
              <th>Keadaan</th>
              <th>Aktivitas</th>
              <th>Aplikasi</th>
              <th>Lama</th>
              <th>Bantuan</th>
              {staff && (
                <>
                  <th>Project</th>
                  <th>File</th>
                  <th>Bahasa</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {room.data.map((p) => (
              <Baris key={p.member_id} p={p} staff={staff} now={now} onSelect={onSelect} />
            ))}
          </tbody>
        </table>
      </div>
      {room.data.length === 0 && <p className="p-4 text-pudar">Kelas ini belum punya anggota.</p>}
    </section>
  );
}

function Baris({ p, staff, now, onSelect }: { p: Presence; staff: boolean; now: number; onSelect?: (p: Presence) => void }) {
  const since = p.state_since && p.state !== "keluar" ? p.state_since : null;
  return (
    <tr
      onClick={onSelect && (() => onSelect(p))}
      className={`border-b border-tinta/20 align-top [&>td]:px-3 [&>td]:py-2 ${p.state === "keluar" ? "text-pudar" : ""} ${onSelect ? "cursor-pointer hover:bg-kertas-tua" : ""}`}
    >
      <td className="font-mono uppercase">{p.seat_code ?? "—"}</td>
      <td>
        <span className="mr-2">{p.user.name}</span>
        {p.role === "admin" && <span className="tag text-marun">Ketua Kelas</span>}
      </td>
      <td className="whitespace-nowrap">
        <span className={`mr-1.5 inline-block size-2.5 ${STATE_COLOR[p.state]}`} />
        {STATE_LABEL[p.state]}
        {p.state_reason && <span className="text-pudar"> · {REASON_LABEL[p.state_reason]}</span>}
      </td>
      <td>{p.activity ? ACTIVITY_LABEL[p.activity] : "—"}</td>
      <td>{p.app_label ?? "—"}</td>
      <td className="whitespace-nowrap font-mono" title={since ? `sejak ${formatClock(since)} WIB` : undefined}>
        {lama(p, now)}
      </td>
      <td>
        {p.help_request ? (
          <span className={p.help_request.status === "menunggu" ? "text-oranye" : ""}>
            <span className="tag mr-1.5">{HELP_LABEL[p.help_request.status]}</span>
            {p.help_request.note}
          </span>
        ) : (
          "—"
        )}
      </td>
      {staff && (
        <>
          <td>{p.project ?? "—"}</td>
          <td className="font-mono">{p.file_name ?? "—"}</td>
          <td>{p.language ?? "—"}</td>
        </>
      )}
    </tr>
  );
}

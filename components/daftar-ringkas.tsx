"use client";

import { countByState, STATE_LABEL, subAktivitas } from "@/lib/presence";
import type { Presence, PresenceList, PresenceState } from "@/lib/types";
import { STATE_COLOR } from "./daftar-presence";

// Daftar presence sempit untuk panel di samping scene 3D.
export function DaftarRingkas({
  room,
  selected,
  onSelect,
}: {
  room: PresenceList;
  selected: number | null;
  onSelect?: (p: Presence) => void;
}) {
  const count = countByState(room.data);
  return (
    <div>
      <p className="flex flex-wrap gap-x-3 border-b-2 border-tinta px-4 py-2 font-mono text-xs">
        {(Object.keys(count) as PresenceState[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`size-2 ${STATE_COLOR[s]}`} />
            {count[s]} {STATE_LABEL[s].toLowerCase()}
          </span>
        ))}
      </p>
      <ul>
        {room.data.map((p) => (
          <li key={p.member_id}>
            <button
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(p)}
              className={`flex w-full items-center gap-2 border-b border-tinta/20 px-4 py-1.5 text-left text-sm enabled:hover:bg-kertas-tua ${
                selected === p.user.id ? "bg-kertas-tua" : ""
              } ${p.state === "keluar" ? "text-pudar" : ""}`}
            >
              <span className="w-7 font-mono text-xs uppercase text-pudar">{p.seat_code ?? "—"}</span>
              <span className={`size-2 shrink-0 ${STATE_COLOR[p.state]}`} />
              <span className="min-w-0 flex-1 truncate">
                {p.user.name}
                {p.role === "admin" && <span className="ml-1.5 font-mono text-[10px] uppercase text-marun">Ketua</span>}
              </span>
              {p.help_request?.status === "menunggu" && <span className="text-oranye" title="Angkat tangan">✋</span>}
              <span className="truncate font-mono text-[11px] uppercase text-pudar">{subAktivitas(p)}</span>
            </button>
          </li>
        ))}
      </ul>
      {room.data.length === 0 && <p className="p-4 text-sm text-pudar">Kelas ini belum punya anggota.</p>}
    </div>
  );
}

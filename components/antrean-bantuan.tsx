"use client";

import { antreanBantuan, formatClock, formatDuration } from "@/lib/presence";
import type { Presence, PresenceList } from "@/lib/types";
import { useNow } from "./daftar-presence";

// Antrean angkat tangan untuk koordinator dan ketua kelas. Tangani dan selesaikan lewat detail peserta.
export function AntreanBantuan({ room, selected, onSelect }: { room: PresenceList; selected: number | null; onSelect: (p: Presence) => void }) {
  const now = useNow();
  const antre = antreanBantuan(room.data);
  if (antre.length === 0) return null;

  return (
    <section className="border-b-2 border-tinta">
      <p className="label-mono border-b-2 border-tinta bg-oranye px-4 py-1.5 text-kertas">Antrean bantuan · {antre.length}</p>
      <ol>
        {antre.map((p, i) => (
          <li key={p.member_id}>
            <button
              type="button"
              onClick={() => onSelect(p)}
              className={`flex w-full items-start gap-2 border-b border-tinta/20 px-4 py-2 text-left text-sm hover:bg-kertas-tua ${selected === p.user.id ? "bg-kertas-tua" : ""}`}
            >
              <span className="w-5 font-mono text-xs text-pudar">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">
                  {p.help_request.status === "menunggu" && <span className="mr-1 text-oranye">✋</span>}
                  {p.user.name}
                  <span className="ml-1.5 font-mono text-[11px] uppercase text-pudar">{p.seat_code ?? "—"}</span>
                </span>
                {p.help_request.note && <span className="block truncate">“{p.help_request.note}”</span>}
                <span className="block font-mono text-[11px] text-pudar">
                  {formatClock(p.help_request.created_at)} · {now ? formatDuration((now - new Date(p.help_request.created_at).getTime()) / 1000) : "—"}
                  {p.help_request.handled_by && ` · dibantu ${p.help_request.handled_by.name}`}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

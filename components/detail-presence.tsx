"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { api, errorMessage } from "@/lib/api";
import { formatClock, HELP_LABEL, STATE_LABEL, subAktivitas } from "@/lib/presence";
import type { HelpStatus, Presence } from "@/lib/types";
import { lama, STATE_COLOR, useNow } from "./daftar-presence";

// Detail kerjaan satu peserta untuk koordinator dan ketua kelas, beserta tindak lanjut bantuan dan teguran.
export function DetailPresence({
  p,
  slug,
  bisaTegur,
  berkunjung,
  onClose,
}: {
  p: Presence;
  slug: string;
  // Cuma koordinator yang bisa minta ketua kelas mengecek peserta.
  bisaTegur: boolean;
  berkunjung: boolean;
  onClose: () => void;
}) {
  const now = useNow();
  const [pesan, setPesan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const idle = p.state === "istirahat" && (p.state_reason === "idle" || p.state_reason === "terputus");

  async function bantuan(status: HelpStatus) {
    if (!p.help_request) return;
    setBusy(true);
    try {
      await api(`/api/help-requests/${p.help_request.id}`, { method: "PATCH", body: { status } });
      setPesan(null);
    } catch (e) {
      setPesan(errorMessage(e));
    }
    setBusy(false);
  }

  async function tegur(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = new FormData(event.currentTarget).get("message");
    setBusy(true);
    try {
      await api("/api/nudges", { method: "POST", body: { classroom: slug, about_user_id: p.user.id, message } });
      setPesan("Teguran terkirim ke ketua kelas.");
    } catch (e) {
      setPesan(errorMessage(e));
    }
    setBusy(false);
  }

  return (
    <section className="border-b-2 border-tinta">
      <div className="flex items-start justify-between gap-2 border-b-2 border-tinta px-4 py-3">
        <div>
          <p className="label-mono">Kursi {p.seat_code?.toUpperCase() ?? "—"}</p>
          <h2 className="text-lg font-bold leading-tight">{p.user.name}</h2>
          {p.role === "admin" && <span className="tag text-marun">Ketua Kelas</span>}
        </div>
        <button type="button" className="tombol" onClick={onClose} aria-label="Tutup detail">
          Tutup
        </button>
      </div>
      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 px-4 py-3 text-sm">
        <Baris k="Keadaan">
          <span className={`mr-1.5 inline-block size-2.5 ${STATE_COLOR[p.state]}`} />
          {p.state === "keluar" ? STATE_LABEL.keluar : subAktivitas(p)}
        </Baris>
        <Baris k="Sejak">
          {p.state_since && p.state !== "keluar" ? `${formatClock(p.state_since)} WIB · ${lama(p, now)}` : "—"}
        </Baris>
        <Baris k="Aplikasi">{p.app_label ?? "—"}</Baris>
        <Baris k="Project">{p.project ?? "—"}</Baris>
        <Baris k="File">
          <span className="font-mono">{p.file_name ?? "—"}</span>
        </Baris>
        <Baris k="Bahasa">{p.language ?? "—"}</Baris>
        <Baris k="Heartbeat">{p.last_heartbeat_at ? `${formatClock(p.last_heartbeat_at)} WIB` : "Belum pernah"}</Baris>
      </dl>

      {p.help_request && (
        <div className="border-t-2 border-dashed border-tinta px-4 py-3">
          <p className="text-sm">
            <span className="tag mr-2 text-oranye">{HELP_LABEL[p.help_request.status]}</span>
            {p.help_request.note ?? "Tanpa catatan"}
          </p>
          <div className="mt-2 flex gap-2">
            {p.help_request.status === "menunggu" && (
              <button type="button" className="tombol" disabled={busy} onClick={() => bantuan("ditangani")}>
                Tangani
              </button>
            )}
            <button type="button" className="tombol" disabled={busy} onClick={() => bantuan("selesai")}>
              Selesai
            </button>
          </div>
        </div>
      )}

      {bisaTegur && (
        <div className="border-t-2 border-dashed border-tinta px-4 py-3">
          {!berkunjung ? (
            <p className="text-sm text-pudar">Kunjungi kelas ini dulu untuk minta ketua kelas mengecek peserta.</p>
          ) : !idle ? (
            <p className="text-sm text-pudar">Teguran cuma untuk peserta yang sedang idle atau terputus.</p>
          ) : (
            <form onSubmit={tegur} className="space-y-2">
              <label className="block">
                <span className="label-mono">Minta ketua kelas cek</span>
                <textarea
                  name="message"
                  required
                  maxLength={255}
                  rows={2}
                  defaultValue={`Coba cek ${p.user.name}, dari tadi idle.`}
                  className="mt-1 w-full border-2 border-tinta bg-white px-2 py-1 text-sm"
                />
              </label>
              <button type="submit" className="tombol" disabled={busy}>
                Kirim ke ketua kelas
              </button>
            </form>
          )}
        </div>
      )}
      {pesan && <p className="px-4 pb-3 text-sm text-marun">{pesan}</p>}
    </section>
  );
}

function Baris({ k, children }: { k: string; children: ReactNode }) {
  return (
    <>
      <dt className="label-mono pt-0.5">{k}</dt>
      <dd>{children}</dd>
    </>
  );
}

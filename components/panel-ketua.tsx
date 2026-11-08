"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { KURSI } from "@/lib/kursi";
import { applyNudge, formatClock } from "@/lib/presence";
import type { Device, InstallCode, Member, Nudge } from "@/lib/types";
import type { Teguran } from "@/lib/use-rooms";

type Tab = "anggota" | "laptop" | "teguran";

// Panel ketua kelas: anggota dan kursi, perintah install agent, laptop, dan teguran.
// Koordinator memakai panel yang sama di halaman Kelola, ditambah penunjukan ketua dan ubah avatar.
export function PanelKetua({
  slug,
  koordinator,
  teguran,
  setTeguran,
  onBerubah,
  onAvatar,
}: {
  slug: string;
  koordinator: boolean;
  teguran?: Teguran[];
  setTeguran?: (fn: (all: Teguran[]) => Teguran[]) => void;
  onBerubah?: () => void;
  onAvatar?: (m: Member) => void;
}) {
  const [tab, setTab] = useState<Tab>("anggota");
  const tabs: Tab[] = teguran ? ["anggota", "laptop", "teguran"] : ["anggota", "laptop"];
  const terbuka = teguran?.filter((n) => n.status !== "selesai").length ?? 0;

  return (
    <div>
      <nav className="flex border-b-2 border-tinta">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 border-r-2 border-tinta px-3 py-2 font-mono text-xs uppercase tracking-wider last:border-r-0 ${t === tab ? "bg-tinta text-kertas" : "hover:bg-kertas-tua"}`}
          >
            {t}
            {t === "teguran" && terbuka > 0 && <span className="ml-1 bg-oranye px-1 text-kertas">{terbuka}</span>}
          </button>
        ))}
      </nav>
      {tab === "anggota" && <Anggota slug={slug} koordinator={koordinator} onBerubah={onBerubah} onAvatar={onAvatar} />}
      {tab === "laptop" && <Laptop slug={slug} />}
      {tab === "teguran" && teguran && setTeguran && <DaftarTeguran list={teguran} setList={setTeguran} />}
    </div>
  );
}

function Anggota({ slug, koordinator, onBerubah, onAvatar }: { slug: string; koordinator: boolean; onBerubah?: () => void; onAvatar?: (m: Member) => void }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [install, setInstall] = useState<{ memberId: number; data: InstallCode } | null>(null);
  const [busy, setBusy] = useState<number | "baru" | null>(null);

  const load = useCallback(
    () =>
      api<{ data: Member[] }>(`/api/classrooms/${slug}/members`).then(
        (r) => setMembers(r.data),
        (e: unknown) => setError(errorMessage(e)),
      ),
    [slug],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function ubah(id: number | "baru", fn: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await fn();
      await load();
      onBerubah?.();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 422 ? Object.values(e.body?.errors ?? {})[0]?.[0] ?? e.message : errorMessage(e));
    }
    setBusy(null);
  }

  function tambah(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const d = new FormData(form);
    void ubah("baru", async () => {
      await api(`/api/classrooms/${slug}/members`, {
        method: "POST",
        body: { email: d.get("email"), name: d.get("name") || undefined, seat_code: d.get("seat_code") || null },
      });
      form.reset();
    });
  }

  async function buatInstall(m: Member) {
    setBusy(m.id);
    setError(null);
    try {
      const r = await api<{ data: InstallCode }>(`/api/classrooms/${slug}/members/${m.id}/install-code`, { method: "POST" });
      setInstall({ memberId: m.id, data: r.data });
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(null);
  }

  if (!members) return <p className="label-mono p-4">{error ?? "Memuat anggota…"}</p>;
  const terpakai = new Set(members.map((m) => m.seat_code).filter(Boolean));
  const kosong = (KURSI[slug] ?? []).filter((k) => !terpakai.has(k));

  return (
    <div>
      <form onSubmit={tambah} className="grid grid-cols-2 gap-2 border-b-2 border-tinta p-3">
        <p className="label-mono col-span-2">Tambah anggota</p>
        <input name="email" type="email" required placeholder="email@contoh.com" className="col-span-2 border-2 border-tinta bg-white px-2 py-1 text-sm" />
        <input name="name" placeholder="Nama (kalau akun baru)" className="border-2 border-tinta bg-white px-2 py-1 text-sm" />
        <select name="seat_code" className="border-2 border-tinta bg-white px-2 py-1 text-sm" defaultValue="">
          <option value="">Tanpa kursi</option>
          {kosong.map((k) => (
            <option key={k} value={k}>
              Kursi {k.toUpperCase()}
            </option>
          ))}
        </select>
        <button type="submit" className="tombol col-span-2" disabled={busy === "baru"}>
          Tambah
        </button>
      </form>
      {error && <p className="border-b-2 border-tinta px-3 py-2 text-sm text-marun">{error}</p>}

      <ul>
        {members.map((m) => (
          <li key={m.id} className="border-b border-tinta/30 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {m.user.name} {m.role === "admin" && <span className="tag ml-1 text-marun">Ketua Kelas</span>}
                </p>
                <p className="truncate font-mono text-xs text-pudar">{m.user.email}</p>
              </div>
              <select
                aria-label={`Kursi ${m.user.name}`}
                value={m.seat_code ?? ""}
                disabled={busy === m.id}
                onChange={(e) =>
                  ubah(m.id, () => api(`/api/classrooms/${slug}/members/${m.id}`, { method: "PATCH", body: { seat_code: e.target.value || null } }))
                }
                className="border-2 border-tinta bg-white px-1 py-0.5 font-mono text-xs uppercase"
              >
                <option value="">—</option>
                {[...(m.seat_code ? [m.seat_code] : []), ...kosong]
                  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
                  .map((k) => (
                    <option key={k} value={k}>
                      {k.toUpperCase()}
                    </option>
                  ))}
              </select>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" className="tombol" disabled={busy === m.id} onClick={() => buatInstall(m)}>
                Buat perintah install
              </button>
              {koordinator && m.role !== "admin" && (
                <button
                  type="button"
                  className="tombol"
                  disabled={busy === m.id}
                  onClick={() => ubah(m.id, () => api(`/api/classrooms/${slug}/members/${m.id}`, { method: "PATCH", body: { role: "admin" } }))}
                >
                  Jadikan ketua
                </button>
              )}
              {koordinator && onAvatar && (
                <button type="button" className="tombol" onClick={() => onAvatar(m)}>
                  Avatar
                </button>
              )}
              <button
                type="button"
                className="tombol text-marun"
                disabled={busy === m.id}
                onClick={() => {
                  if (confirm(`Keluarkan ${m.user.name} dari kelas ini? Akunnya tetap ada.`)) {
                    void ubah(m.id, () => api(`/api/classrooms/${slug}/members/${m.id}`, { method: "DELETE" }));
                  }
                }}
              >
                Keluarkan
              </button>
            </div>
            {install?.memberId === m.id && <PerintahInstall data={install.data} onTutup={() => setInstall(null)} />}
          </li>
        ))}
      </ul>
      {members.length === 0 && <p className="p-4 text-sm text-pudar">Belum ada anggota.</p>}
    </div>
  );
}

function PerintahInstall({ data, onTutup }: { data: InstallCode; onTutup: () => void }) {
  const berlaku = new Date(data.expires_at).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="mt-2 space-y-2 border-2 border-tinta bg-white p-2.5">
      <p className="text-sm">
        Kode <span className="font-mono font-bold">{data.code}</span>, sekali pakai, berlaku sampai {berlaku} WIB. Kirim perintah sesuai laptop
        anggota ini; membuat kode baru membatalkan yang lama.
      </p>
      <Perintah judul="Windows (PowerShell)" teks={data.commands.windows} />
      <Perintah judul="macOS / Linux (terminal)" teks={data.commands.macos_linux} />
      <button type="button" className="tombol" onClick={onTutup}>
        Tutup
      </button>
    </div>
  );
}

function Perintah({ judul, teks }: { judul: string; teks: string }) {
  const [salin, setSalin] = useState(false);
  return (
    <div>
      <p className="label-mono">{judul}</p>
      <div className="mt-1 flex items-stretch gap-1">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap border-2 border-tinta bg-kertas px-2 py-1 font-mono text-xs">{teks}</code>
        <button
          type="button"
          className="tombol shrink-0"
          onClick={async () => {
            await salinTeks(teks);
            setSalin(true);
            setTimeout(() => setSalin(false), 1500);
          }}
        >
          {salin ? "Tersalin" : "Salin"}
        </button>
      </div>
    </div>
  );
}

// Clipboard API cuma ada di konteks aman (localhost atau https). Saat demo lewat IP biasa, pakai cara lama.
async function salinTeks(teks: string) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(teks);
  const area = document.createElement("textarea");
  area.value = teks;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

const OS: Record<Device["os"], string> = { windows: "Windows", macos: "macOS", linux: "Linux" };

function Laptop({ slug }: { slug: string }) {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api<{ data: Device[] }>(`/api/classrooms/${slug}/devices`).then(
        (r) => setDevices(r.data),
        (e: unknown) => setError(errorMessage(e)),
      ),
    [slug],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function revoke(d: Device) {
    if (!confirm(`Revoke laptop ${d.hostname} milik ${d.user.name}? Agent di laptop itu langsung berhenti, dan perlu kode install baru untuk memasang lagi.`)) return;
    try {
      await api(`/api/devices/${d.id}`, { method: "PATCH", body: { status: "revoked" } });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (!devices) return <p className="label-mono p-4">{error ?? "Memuat laptop…"}</p>;
  return (
    <div>
      {error && <p className="border-b-2 border-tinta px-3 py-2 text-sm text-marun">{error}</p>}
      <ul>
        {devices.map((d) => (
          <li key={d.id} className={`flex items-center gap-2 border-b border-tinta/30 px-3 py-2.5 ${d.status === "revoked" ? "text-pudar" : ""}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{d.user.name}</p>
              <p className="truncate font-mono text-xs text-pudar">
                {d.hostname} · {OS[d.os]} · v{d.agent_version}
              </p>
              <p className="label-mono">{d.last_seen_at ? `Terakhir ${formatClock(d.last_seen_at)} WIB` : "Belum mengirim heartbeat"}</p>
            </div>
            {d.status === "revoked" ? (
              <span className="tag text-pudar">Revoked</span>
            ) : (
              <button type="button" className="tombol text-marun" onClick={() => revoke(d)}>
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
      {devices.length === 0 && <p className="p-4 text-sm text-pudar">Belum ada laptop yang memasang agent.</p>}
    </div>
  );
}

const STATUS_TEGURAN = { terkirim: "Baru", dibaca: "Dibaca", selesai: "Selesai" } as const;

function DaftarTeguran({ list, setList }: { list: Teguran[]; setList: (fn: (all: Teguran[]) => Teguran[]) => void }) {
  const [error, setError] = useState<string | null>(null);

  async function tandai(n: Teguran, status: "dibaca" | "selesai") {
    try {
      const r = await api<{ data: Nudge }>(`/api/nudges/${n.id}`, { method: "PATCH", body: { status } });
      setList((all) => applyNudge(all, r.data));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div>
      {error && <p className="border-b-2 border-tinta px-3 py-2 text-sm text-marun">{error}</p>}
      <ul>
        {list.map((n) => (
          <li key={n.id} className="border-b border-tinta/30 px-3 py-2.5">
            <p className="text-sm">
              <span className={`tag mr-1.5 ${n.status === "terkirim" ? "text-oranye" : "text-pudar"}`}>{STATUS_TEGURAN[n.status]}</span>
              Soal <b>{n.about.name}</b>, dari {n.from.name}
            </p>
            <p className="mt-1 text-sm">“{n.message}”</p>
            <div className="mt-2 flex gap-1.5">
              {n.status === "terkirim" && (
                <button type="button" className="tombol" onClick={() => tandai(n, "dibaca")}>
                  Tandai dibaca
                </button>
              )}
              <button type="button" className="tombol" onClick={() => tandai(n, "selesai")}>
                Selesai
              </button>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="p-4 text-sm text-pudar">Tidak ada teguran yang belum selesai.</p>}
    </div>
  );
}

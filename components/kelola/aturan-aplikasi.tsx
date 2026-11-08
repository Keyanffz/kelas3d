"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { ACTIVITY_LABEL } from "@/lib/presence";
import type { Activity, AppRule } from "@/lib/types";

const input = "border-2 border-tinta bg-white px-2 py-1 text-sm";
const OS = { "": "Semua OS", windows: "Windows", macos: "macOS", linux: "Linux" } as const;

// Koordinator: aturan pencocokan aplikasi. Agent memakainya saat mengambil config berikutnya.
export function AturanAplikasi() {
  const [rules, setRules] = useState<AppRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ubah, setUbah] = useState<number | null>(null);

  const load = useCallback(
    () =>
      api<{ data: AppRule[] }>("/api/app-rules").then(
        (r) => setRules(r.data),
        (e: unknown) => setError(errorMessage(e)),
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function jalankan(fn: () => Promise<unknown>) {
    try {
      await fn();
      setError(null);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof ApiError && e.status === 422 ? (Object.values(e.body?.errors ?? {})[0]?.[0] ?? e.message) : errorMessage(e));
      return false;
    }
  }

  function dariForm(form: HTMLFormElement) {
    const d = new FormData(form);
    return {
      match_on: d.get("match_on"),
      pattern: d.get("pattern"),
      os: d.get("os") || null,
      activity: d.get("activity"),
      label: d.get("label"),
      priority: Number(d.get("priority")),
    };
  }

  if (!rules) return <p className="label-mono">{error ?? "Memuat aturan…"}</p>;

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-pudar">
        Agent mencocokkan aplikasi yang sedang fokus dengan aturan ini. <b>Proses</b> harus sama persis dengan nama proses (di Windows termasuk .exe), <b>judul</b>{" "}
        cukup mengandung pola. Kalau beberapa cocok, prioritas terbesar menang; yang tidak cocok jadi Lainnya.
      </p>
      {error && <p className="text-sm text-marun">{error}</p>}
      <div className="overflow-x-auto border-2 border-tinta bg-kertas">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead>
            <tr className="label-mono border-b-2 border-tinta [&>th]:px-3 [&>th]:py-2 [&>th]:font-normal">
              <th>Cocokkan</th>
              <th>Pola</th>
              <th>OS</th>
              <th>Aktivitas</th>
              <th>Label</th>
              <th>Prioritas</th>
              <th>Aktif</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) =>
              ubah === r.id ? (
                <tr key={r.id} className="border-b border-tinta/20 bg-white">
                  <td colSpan={8} className="p-2">
                    <FormAturan
                      awal={r}
                      onBatal={() => setUbah(null)}
                      onSubmit={async (form) => {
                        if (await jalankan(() => api(`/api/app-rules/${r.id}`, { method: "PATCH", body: dariForm(form) }))) setUbah(null);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={r.id} className={`border-b border-tinta/20 [&>td]:px-3 [&>td]:py-1.5 ${r.is_active ? "" : "text-pudar"}`}>
                  <td>{r.match_on === "process" ? "Proses" : "Judul"}</td>
                  <td className="font-mono">{r.pattern}</td>
                  <td>{OS[r.os ?? ""]}</td>
                  <td>{ACTIVITY_LABEL[r.activity]}</td>
                  <td>{r.label}</td>
                  <td className="font-mono">{r.priority}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={r.is_active}
                      aria-label={`Aktifkan ${r.label}`}
                      onChange={(e) => jalankan(() => api(`/api/app-rules/${r.id}`, { method: "PATCH", body: { is_active: e.target.checked } }))}
                      className="size-4 accent-tinta"
                    />
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button type="button" className="mr-3 font-mono text-xs uppercase hover:underline" onClick={() => setUbah(r.id)}>
                      Ubah
                    </button>
                    <button
                      type="button"
                      className="font-mono text-xs uppercase text-marun hover:underline"
                      onClick={() => confirm(`Hapus aturan ${r.label} (${r.pattern})?`) && jalankan(() => api(`/api/app-rules/${r.id}`, { method: "DELETE" }))}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <div className="border-2 border-dashed border-tinta p-3">
        <p className="label-mono mb-2">Aturan baru</p>
        <FormAturan
          onSubmit={async (form) => {
            if (await jalankan(() => api("/api/app-rules", { method: "POST", body: dariForm(form) }))) form.reset();
          }}
        />
      </div>
    </div>
  );
}

function FormAturan({ awal, onSubmit, onBatal }: { awal?: AppRule; onSubmit: (form: HTMLFormElement) => void; onBatal?: () => void }) {
  return (
    <form
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit(e.currentTarget);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <select name="match_on" defaultValue={awal?.match_on ?? "process"} className={input}>
        <option value="process">Proses</option>
        <option value="title">Judul</option>
      </select>
      <input name="pattern" required defaultValue={awal?.pattern} placeholder="Code.exe" className={`${input} w-40 font-mono`} />
      <select name="os" defaultValue={awal?.os ?? ""} className={input}>
        {Object.entries(OS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <select name="activity" defaultValue={awal?.activity ?? "ngoding"} className={input}>
        {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => (
          <option key={a} value={a}>
            {ACTIVITY_LABEL[a]}
          </option>
        ))}
      </select>
      <input name="label" required maxLength={100} defaultValue={awal?.label} placeholder="VS Code" className={`${input} w-32`} />
      <input name="priority" type="number" min={0} max={1000} required defaultValue={awal?.priority ?? 10} className={`${input} w-20 font-mono`} aria-label="Prioritas" />
      <button type="submit" className="tombol">
        {awal ? "Simpan" : "Tambah"}
      </button>
      {onBatal && (
        <button type="button" className="tombol" onClick={onBatal}>
          Batal
        </button>
      )}
    </form>
  );
}

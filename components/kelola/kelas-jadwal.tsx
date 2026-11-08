"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Classroom, Schedule } from "@/lib/types";

export const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const pesanError = (e: unknown) =>
  e instanceof ApiError && e.status === 422 ? (Object.values(e.body?.errors ?? {})[0]?.[0] ?? e.message) : errorMessage(e);

const input = "border-2 border-tinta bg-white px-2 py-1 text-sm";

// Koordinator: kelas beserta pengaturan jaringan dan jadwalnya.
export function KelasJadwal({ classrooms, onBerubah }: { classrooms: Classroom[]; onBerubah: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function tambah(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const d = new FormData(form);
    try {
      await api("/api/classrooms", {
        method: "POST",
        body: { name: d.get("name"), slug: d.get("slug"), network_cidr: d.get("network_cidr") || null, public_ip: d.get("public_ip") || null },
      });
      form.reset();
      setError(null);
      onBerubah();
    } catch (e) {
      setError(pesanError(e));
    }
  }

  return (
    <div className="space-y-6">
      {classrooms.map((c) => (
        <Kelas key={c.id} kelas={c} onBerubah={onBerubah} />
      ))}
      <form onSubmit={tambah} className="grid gap-2 border-2 border-dashed border-tinta p-4 sm:grid-cols-4">
        <p className="label-mono sm:col-span-4">Kelas baru</p>
        <input name="name" required placeholder="Nama, contoh Mobile" className={input} />
        <input name="slug" required pattern="[a-z0-9-]+" placeholder="slug, contoh mobile" className={`${input} font-mono`} />
        <input name="network_cidr" placeholder="Subnet (opsional)" className={`${input} font-mono`} />
        <input name="public_ip" placeholder="IP publik (opsional)" className={`${input} font-mono`} />
        <p className="text-xs text-pudar sm:col-span-3">Kelas selain Developer dan Data Science belum punya ruangan dan kursi di gedung 3D, jadi cuma tampil di mode daftar.</p>
        <button type="submit" className="tombol">
          Tambah kelas
        </button>
        {error && <p className="text-sm text-marun sm:col-span-4">{error}</p>}
      </form>
    </div>
  );
}

function Kelas({ kelas, onBerubah }: { kelas: Classroom; onBerubah: () => void }) {
  const [jadwal, setJadwal] = useState<Schedule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simpan, setSimpan] = useState(false);

  const load = useCallback(
    () =>
      api<{ data: Schedule[] }>(`/api/classrooms/${kelas.slug}/schedules`).then(
        (r) => setJadwal(r.data),
        (e: unknown) => setError(errorMessage(e)),
      ),
    [kelas.slug],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function jalankan(fn: () => Promise<unknown>) {
    try {
      await fn();
      setError(null);
      await load();
    } catch (e) {
      setError(pesanError(e));
    }
  }

  async function ubahKelas(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    try {
      await api(`/api/classrooms/${kelas.slug}`, {
        method: "PUT",
        body: { name: d.get("name"), slug: kelas.slug, network_cidr: d.get("network_cidr") || null, public_ip: d.get("public_ip") || null },
      });
      setError(null);
      setSimpan(true);
      setTimeout(() => setSimpan(false), 1500);
      onBerubah();
    } catch (e) {
      setError(pesanError(e));
    }
  }

  function tambahJadwal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const d = new FormData(form);
    void jalankan(async () => {
      await api(`/api/classrooms/${kelas.slug}/schedules`, {
        method: "POST",
        body: { type: d.get("type"), day_of_week: Number(d.get("day_of_week")), starts_at: d.get("starts_at"), ends_at: d.get("ends_at") },
      });
      form.reset();
    });
  }

  return (
    <section className="border-2 border-tinta bg-kertas">
      <form onSubmit={ubahKelas} className="flex flex-wrap items-end gap-2 border-b-2 border-tinta p-3">
        <label>
          <span className="label-mono block">Nama</span>
          <input name="name" defaultValue={kelas.name} required className={`${input} font-bold`} />
        </label>
        <label>
          <span className="label-mono block">Subnet ruangan</span>
          <input name="network_cidr" defaultValue={kelas.network_cidr ?? ""} placeholder="192.168.10.0/24" className={`${input} w-44 font-mono`} />
        </label>
        <label>
          <span className="label-mono block">IP publik</span>
          <input name="public_ip" defaultValue={kelas.public_ip ?? ""} placeholder="—" className={`${input} w-36 font-mono`} />
        </label>
        <span className="label-mono pb-1.5">/{kelas.slug}</span>
        <button type="submit" className="tombol ml-auto">
          {simpan ? "Tersimpan" : "Simpan"}
        </button>
      </form>
      {error && <p className="border-b-2 border-tinta px-3 py-2 text-sm text-marun">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="label-mono border-b border-tinta/30 [&>th]:px-3 [&>th]:py-1.5 [&>th]:font-normal">
            <th>Jenis</th>
            <th>Hari</th>
            <th>Jam</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {jadwal?.map((j) => (
            <tr key={j.id} className="border-b border-tinta/20 [&>td]:px-3 [&>td]:py-1.5">
              <td>
                <span className={`tag ${j.type === "kelas" ? "text-hijau" : "text-kuning"}`}>{j.type === "kelas" ? "Kelas" : "Istirahat"}</span>
              </td>
              <td>{HARI[j.day_of_week]}</td>
              <td className="font-mono">
                {j.starts_at}–{j.ends_at}
              </td>
              <td className="text-right">
                <button
                  type="button"
                  className="font-mono text-xs uppercase text-marun hover:underline"
                  onClick={() => confirm(`Hapus jadwal ${HARI[j.day_of_week]} ${j.starts_at}–${j.ends_at}?`) && jalankan(() => api(`/api/classrooms/${kelas.slug}/schedules/${j.id}`, { method: "DELETE" }))}
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {jadwal?.length === 0 && <p className="px-3 py-2 text-sm text-pudar">Belum ada jadwal; agent tidak mengirim heartbeat di luar jadwal kelas.</p>}
      <form onSubmit={tambahJadwal} className="flex flex-wrap items-center gap-2 p-3">
        <select name="type" className={input}>
          <option value="kelas">Kelas</option>
          <option value="istirahat">Istirahat</option>
        </select>
        <select name="day_of_week" className={input}>
          {HARI.slice(1).map((h, i) => (
            <option key={h} value={i + 1}>
              {h}
            </option>
          ))}
        </select>
        <input name="starts_at" type="time" required defaultValue="08:00" className={input} />
        <span>–</span>
        <input name="ends_at" type="time" required defaultValue="16:00" className={input} />
        <button type="submit" className="tombol">
          Tambah jadwal
        </button>
      </form>
    </section>
  );
}

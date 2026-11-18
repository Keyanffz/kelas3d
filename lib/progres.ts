export interface ProgressDay {
  date: string;
  aktif: number;
  ngoding: number;
}

export type SlotAksesoris = "topi" | "meja";

export interface Aksesoris {
  id: string;
  slot: SlotAksesoris;
  nama: string;
  level: number;
  terbuka: boolean;
}

export interface Progress {
  days: ProgressDay[];
  streak: { sekarang: number; terbaik: number };
  // dari dan ke: batas XP level sekarang dan level berikutnya.
  xp: { total: number; level: number; dari: number; ke: number };
  aksesoris: Aksesoris[];
  dipakai: Record<SlotAksesoris, string | null>;
}

export type Rentang = "hari" | "minggu" | "bulan";

export interface Kelompok {
  kunci: string;
  label: string;
  aktif: number;
  ngoding: number;
}

const JUMLAH: Record<Rentang, number> = { hari: 14, minggu: 8, bulan: 3 };

// Tanggal "YYYY-MM-DD" dihitung di UTC supaya zona waktu browser tidak menggeser hari.
const keDate = (s: string) => new Date(`${s}T00:00:00Z`);
const keString = (d: Date) => d.toISOString().slice(0, 10);

function kunciDari(date: string, rentang: Rentang): string {
  if (rentang === "hari") return date;
  if (rentang === "bulan") return date.slice(0, 7);
  const d = keDate(date);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return keString(d);
}

function mundur(kunci: string, rentang: Rentang): string {
  if (rentang === "bulan") {
    const [y, m] = kunci.split("-").map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  }
  const d = keDate(kunci);
  d.setUTCDate(d.getUTCDate() - (rentang === "hari" ? 1 : 7));
  return keString(d);
}

function labelDari(kunci: string, rentang: Rentang): string {
  if (rentang === "bulan") return keDate(`${kunci}-01`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
  const tgl = keDate(kunci).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
  if (rentang === "minggu") return `Sejak ${tgl}`;
  return `${keDate(kunci).toLocaleDateString("id-ID", { weekday: "short", timeZone: "UTC" })} ${tgl}`;
}

// Batang grafik dari yang terlama; yang terakhir adalah hari, minggu (mulai Senin), atau bulan ini.
export function kelompokkan(days: ProgressDay[], rentang: Rentang, hariIni: string): Kelompok[] {
  const kunci = [kunciDari(hariIni, rentang)];
  while (kunci.length < JUMLAH[rentang]) kunci.unshift(mundur(kunci[0], rentang));

  const isi = new Map(kunci.map((k) => [k, { kunci: k, label: labelDari(k, rentang), aktif: 0, ngoding: 0 }]));
  for (const d of days) {
    const k = isi.get(kunciDari(d.date, rentang));
    if (!k) continue;
    k.aktif += d.aktif;
    k.ngoding += d.ngoding;
  }
  return [...isi.values()];
}

export const hariIniJakarta = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

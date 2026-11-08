import type { ValidationErrorBody } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ValidationErrorBody | null,
  ) {
    super(body?.message ?? `Request gagal (${status})`);
  }

  // Pesan validasi pertama untuk field tertentu, atau pesan umum.
  field(name: string): string {
    return this.body?.errors?.[name]?.[0] ?? this.message;
  }
}

function xsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function csrfCookie(): Promise<Response> {
  return fetch(`${API_URL}/sanctum/csrf-cookie`, { credentials: "include" });
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? "GET";
  // Cookie XSRF bisa belum ada (sesi baru) atau sudah hilang; ambil dulu sebelum request yang mengubah data.
  if (method !== "GET" && !xsrfToken()) await csrfCookie();

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = xsrfToken();
  if (token) headers["X-XSRF-TOKEN"] = token;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ValidationErrorBody | null;
    throw new ApiError(res.status, body);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Tidak bisa menghubungi server. Cek kelas3d-api sudah jalan.";
  if (error.status === 403) return "Kamu tidak punya akses ke halaman ini.";
  if (error.status === 404) return "Data tidak ditemukan.";
  if (error.status === 429) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  return error.message;
}

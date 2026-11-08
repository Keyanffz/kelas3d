"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, csrfCookie, errorMessage } from "@/lib/api";

const LINK_MATI = "Link masuk sudah dipakai atau kedaluwarsa (berlaku 2 menit). Jalankan kelas3d buka lagi di terminal.";

export function TukarToken() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [error, setError] = useState<string | null>(null);
  // Token cuma berlaku sekali; Strict Mode menjalankan effect dua kali di dev.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    csrfCookie()
      .then(() => api("/api/login/link", { method: "POST", body: { token } }))
      .then(
        () => router.replace("/"),
        (e: unknown) => setError(e instanceof ApiError && e.status === 422 ? LINK_MATI : errorMessage(e)),
      );
  }, [token, router]);

  if (!token || error) return <p className="mt-2 border-l-4 border-marun pl-2 text-marun">{error ?? LINK_MATI}</p>;
  return <p className="mt-2">Memeriksa link masuk…</p>;
}

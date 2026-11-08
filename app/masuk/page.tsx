import { Suspense } from "react";
import { TukarToken } from "./tukar-token";

// Link dari `kelas3d buka`: /masuk?token=...
export default function MasukPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm border-2 border-tinta bg-kertas px-5 py-4">
        <p className="label-mono">Kelas 3D · Bengkel Koding</p>
        <Suspense fallback={<p className="mt-2">Memeriksa link masuk…</p>}>
          <TukarToken />
        </Suspense>
      </div>
    </main>
  );
}

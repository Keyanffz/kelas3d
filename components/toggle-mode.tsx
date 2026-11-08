"use client";

// Pindah antara scene 3D dan mode daftar.
export function ToggleMode({ mode, onMode }: { mode: "3d" | "daftar"; onMode: (m: "3d" | "daftar") => void }) {
  return (
    <div className="flex border-2 border-tinta font-mono text-xs uppercase tracking-wider">
      {(["3d", "daftar"] as const).map((m) => (
        <button key={m} type="button" onClick={() => onMode(m)} className={`px-3 py-1.5 ${mode === m ? "bg-tinta text-kertas" : "hover:bg-kertas-tua"}`}>
          {m === "3d" ? "3D" : "Daftar"}
        </button>
      ))}
    </div>
  );
}

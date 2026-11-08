import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="border-2 border-tinta bg-kertas px-6 py-5 text-center">
        <p className="label-mono">404</p>
        <p className="mt-1 font-bold">Ruangan ini tidak ada di denah.</p>
        <Link href="/" className="tombol mt-4 inline-block">
          Kembali
        </Link>
      </div>
    </main>
  );
}

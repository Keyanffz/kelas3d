# Dokumentasi kelas3d-web

Catatan semua file baru dan file yang diubah. Entri terbaru di paling bawah.

## 2026-11-07 · Tahap 1, Aset 3D

File baru:
- Hasil `create-next-app` 16.4.5 mode `--empty` (App Router, TypeScript, Tailwind v4 lewat `@tailwindcss/turbopack`, ESLint): `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `eslint.config.mjs`, `.gitignore`, `README.md`, `AGENTS.md`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.
- `blender/`: tempat file .blend aset 3D.
- `blender/avatar.blend`: avatar laki dan perempuan (termasuk set rok), lima model rambut, patch kelas, ban lengan ketua, armature `kerangka`, dan 11 klip animasi. Disimpan otomatis tiap selesai satu langkah.
- `blender/gedung.blend`: gedung kelas dari sketsa Key. Isinya lorong, ruang koordinator, kelas Developer, dan kelas Data Science, masing-masing di collection dan empty induk sendiri. Isinya kerangka (lantai, dinding, pintu, jendela, tirai), isi ruangan (32 kursi dan laptop peserta, meja panjang Data Science, meja U Developer, TV, papan tulis, kanban, printer, area lesehan dan beanbag, ruang koordinator untuk dua koordinator dengan tujuh kursi tamu dan TV, papan nama pintu), dan 98 titik untuk web di collection `titik`.
- `public/models/`: tempat file .glb hasil export.
- `public/models/avatar-laki.glb` (635 KB) dan `public/models/avatar-perempuan.glb` (659 KB): export dari `avatar.blend` dengan Apply Modifiers dan mode animasi Actions. Isinya armature `kerangka` (11 tulang), badan sesuai tipe (perempuan termasuk set rok), lima rambut, dua patch kelas, ban lengan ketua, 18 material, dan 11 klip animasi. Bagian badan nempel ke node tulang, tanpa skin.
- `public/models/gedung.glb` (736 KB): export dari `gedung.blend` tanpa animasi. Akar scene-nya empat empty ruangan (`lorong`, `ruang_koordinator`, `ruang_developer`, `ruang_data_science`). Isinya 145 objek bermesh yang memakai 53 mesh (kursi, laptop, meja, dan beanbag dipakai ulang), 36 material termasuk `layar_laptop`, dan 98 titik. Kamera dan lampu bawaan Blender tidak ikut.
- `dokumentasi.md`: catatan ini.

File diubah:
- `.gitignore`: tambah `*.blend1`, file backup otomatis Blender.

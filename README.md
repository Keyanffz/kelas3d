# kelas3d-web

Web Kelas 3D Bengkel Koding: gedung kelas 3D dengan avatar peserta yang bergerak sesuai keadaan laptopnya secara realtime, dashboard koordinator, dan panel ketua kelas. Next.js, TypeScript, Tailwind, dan React Three Fiber, tersambung ke `kelas3d-api`.

```bash
cp .env.example .env.local   # isi NEXT_PUBLIC_REVERB_APP_KEY
npm install
npm run dev
```

Halaman, variabel env, demo di jaringan kelas, dan riwayat perubahan ada di `dokumentasi.md`. File Blender aset 3D ada di `blender/`, hasil export .glb di `public/models/`.

# Dokumentasi kelas3d-web

Acuan untuk menjalankan dan mengembangkan web Kelas 3D: halaman, variabel env, cara menjalankan, dan demo di jaringan kelas. Kontrak API ada di `kelas3d-api/dokumentasi.md`. Catatan file baru dan file yang diubah ada di bagian Riwayat perubahan, entri terbaru di paling bawah.

## Halaman

Semua halaman berupa client component. Sesi web memakai cookie Sanctum milik API, jadi pengecekan login dilakukan di browser lewat `GET /api/me`.

| Halaman | Untuk | Isi |
| --- | --- | --- |
| `/login` | Koordinator | Email dan password |
| `/masuk?token=...` | Peserta dan ketua kelas | Menukar token dari `kelas3d buka` lewat `POST /api/login/link`, lalu ke `/` |
| `/` | Semua yang sudah login | Login pertama (`avatar` masih `null`) ke `/avatar`. Sesudah itu koordinator ke `/gedung`, anggota ke kelas pertamanya. Peserta tanpa kelas mendapat pesan |
| `/avatar` | Semua | Pemilih avatar: pratinjau 3D, tipe badan, rambut, dan warna |
| `/gedung` | Koordinator | Scene 3D seluruh gedung atau mode daftar, tombol kunjungan per kelas, mode Jelajah, form pengumuman, serta detail peserta dan teguran. Selain koordinator diarahkan ke `/` |
| `/kelas/[slug]` | Anggota dan ketua kelas (koordinator juga boleh) | Scene ruangan itu atau mode daftar, angkat tangan, dan panel ketua kelas di sisi kanan khusus ketua. Project, file, dan bahasa cuma untuk koordinator dan ketua kelas |
| `/kelola` | Koordinator | Tab kelas dan jadwal, anggota (panel ketua kelas plus penunjukan ketua dan ubah avatar), aturan aplikasi, dan rekap aktivitas |

Halaman di dalam `app/(app)/` dijaga `Session`: tanpa sesi diarahkan ke `/login`. Header-nya menampilkan nama, tag role, tautan ubah avatar, status sambungan realtime, dan tombol Keluar. Scene 3D dimuat lewat `next/dynamic` tanpa SSR, jadi mode daftar tidak ikut memuat three.js.

## Variabel env

Salin `.env.example` ke `.env.local` (tidak di-commit).

| Variabel | Isi |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Alamat `kelas3d-api` tanpa `/api`, contoh `http://localhost:8000` |
| `NEXT_PUBLIC_REVERB_APP_KEY` | Nilai `REVERB_APP_KEY` di `.env` API |
| `NEXT_PUBLIC_REVERB_HOST` | Host Reverb, contoh `localhost` |
| `NEXT_PUBLIC_REVERB_PORT` | Port Reverb, default `8080` |

Variabel `NEXT_PUBLIC_*` ditanam ke kode saat build. Sesudah mengubahnya, jalankan ulang `next dev` atau build ulang untuk `next start`.

## Menjalankan di lokal

API dulu, lalu web:

```bash
cd ../kelas3d-api && composer dev
npm run dev
```

Buka `http://localhost:3000`. Pemeriksaan sebelum commit:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

`npm test` menjalankan Vitest untuk logika murni di `lib/` dan `components/scene/model.test.ts`, yang memuat file .glb langsung untuk mengecek persiapan gedung dan rakitan avatar. `vitest.config.mts` cuma berisi alias `@/`. Kalau `tsc` mengeluh soal `.next/types` sesudah halaman dipindah atau dihapus, jalankan `npx next typegen` dulu.

### Banyak avatar tanpa banyak laptop

Perintah simulasi di API mengisi anggota palsu yang keadaannya berubah lewat jalur heartbeat sungguhan, jadi event realtime ikut terkirim:

```bash
cd ../kelas3d-api
php artisan kelas3d:simulasi developer --jumlah=12
php artisan kelas3d:simulasi developer --hapus
```

Penjelasan opsinya ada di `kelas3d-api/dokumentasi.md` bagian Simulasi. Hapus anggota palsu sebelum demo.

## Demo di jaringan kelas

Laptop Key jadi server, laptop peserta tersambung lewat WiFi yang sama. Semua alamat memakai IP laptop Key, termasuk saat dibuka dari laptop Key sendiri, karena CORS API cuma menerima satu origin (`FRONTEND_URL`). Contoh di bawah memakai `192.168.1.11`.

1. Cari IP laptop di WiFi itu: `ip -4 -o addr show scope global`. IP bisa berubah tiap ganti WiFi, jadi ulangi langkah ini di lokasi presentasi.
2. `.env` API:

   ```env
   APP_URL=http://192.168.1.11:8000
   FRONTEND_URL=http://192.168.1.11:3000
   SANCTUM_STATEFUL_DOMAINS=192.168.1.11:3000
   SERVER_HOST=0.0.0.0
   ```

   `SERVER_HOST` membuat `php artisan serve` (bagian dari `composer dev`) mendengarkan di semua antarmuka, bukan cuma `127.0.0.1`. Reverb sudah mendengarkan di `0.0.0.0` dari awal (`REVERB_SERVER_HOST`), dan `REVERB_HOST=localhost` tetap, karena itu alamat yang dipakai Laravel sendiri untuk mengirim event. `SESSION_DOMAIN=null` membuat cookie sesi berlaku untuk host IP itu di port 3000 maupun 8000. Perintah install dan link masuk ikut memakai `APP_URL` dan `FRONTEND_URL` ini. Kalau config pernah di-cache, jalankan `php artisan config:clear`.
3. `.env.local` web:

   ```env
   NEXT_PUBLIC_API_URL=http://192.168.1.11:8000
   NEXT_PUBLIC_REVERB_HOST=192.168.1.11
   ```

4. Jalankan:

   ```bash
   cd ../kelas3d-api && composer dev
   npm run build && npx next start -H 0.0.0.0
   ```

   `next start` lebih ringan untuk presentasi. Kalau mau `next dev`, pakai `npx next dev -H 0.0.0.0`; `allowedDevOrigins` di `next.config.ts` otomatis berisi host dari `NEXT_PUBLIC_API_URL`, jadi dev server menerima akses lewat IP itu.
5. Port 3000 (web), 8000 (API), dan 8080 (Reverb) harus terbuka. Di laptop Key saat ini tidak ada firewall yang aktif (ufw, firewalld, dan nftables mati). Kalau nanti dinyalakan, contoh untuk ufw: `sudo ufw allow 3000,8000,8080/tcp`.
6. Agent di-build dengan alamat server itu: `SERVER_URL=http://192.168.1.11:8000/api ./build.sh` di `kelas3d-agent` (lihat `kelas3d-agent/dokumentasi.md` bagian Build dan rilis).
7. Cek dari laptop lain: buka `http://192.168.1.11:3000/login`, lalu pastikan header menampilkan "Realtime tersambung" sesudah masuk.

## Struktur kode

| File | Isi |
| --- | --- |
| `lib/types.ts` | Semua tipe respons dan payload event dari API |
| `lib/api.ts` | Pembungkus `fetch`: cookie, `Accept`, `X-XSRF-TOKEN`, dan `ApiError` |
| `lib/echo.ts` | Satu koneksi Echo ke Reverb, otorisasi channel lewat sesi web, dan `useEchoStatus` |
| `lib/use-rooms.ts` | Presence dan pengumuman hari ini untuk beberapa kelas sekaligus: REST lalu event di channel tiap kelas. Staf ikut channel `.staff` untuk teguran |
| `lib/presence.ts` | Penggabungan event ke daftar, label, dan format waktu (dites) |
| `lib/role.ts` | Halaman awal per role dan cek staf kelas (dites) |
| `lib/kursi.ts` | Kode kursi per kelas, sama dengan config API dan titik `seat_` di `gedung.glb` (dites) |
| `lib/scene/graf.ts` | Jalur jalan avatar lewat titik `wp_` dan `door_`, tanpa navmesh (dites) |
| `lib/scene/gerak.ts` | Rencana langkah dan pemutar gerak satu avatar: jalan, belok, duduk, berdiri (dites) |
| `lib/scene/keadaan.ts` | Tujuan dan klip per keadaan presence, rute kunjungan koordinator, warna layar laptop (dites) |
| `lib/scene/tampilan.ts` | Rakitan avatar dari kolom `avatar`: bagian yang tampil dan warnanya (dites) |
| `components/scene/scene.tsx` | Canvas, kamera orbit, label di atas kepala sebagai lapisan DOM, dinding yang menghadap kamera, dan pintu otomatis |
| `components/scene/dunia.ts` | Persiapan `gedung.glb`: titik, dinding, pintu, layar laptop, penghalang Jelajah, dan penggabungan geometri |
| `components/scene/avatar.tsx` | Avatar satu user: rakitan jadi satu SkinnedMesh, klip, gerak, dan hitbox |
| `components/scene/jelajah.tsx` | Mode Jelajah koordinator: WASD, pointer lock, tabrakan, pintu dengan E beserta promptnya, bidikan ke avatar, dan lanjut dari posisi terakhir |
| `components/scene/pratinjau.tsx` | Pratinjau 3D di pemilih avatar |
| `app/(app)/session.tsx` | Pengaman halaman, context user login, header |
| `components/daftar-presence.tsx` | Mode daftar presence |
| `components/detail-presence.tsx` | Detail kerjaan satu peserta, tindak lanjut bantuan, dan teguran |
| `components/panel-ketua.tsx` | Anggota dan kursi, perintah install agent, laptop, dan teguran |
| `components/kelola/` | Tab Kelola koordinator: kelas dan jadwal, aturan aplikasi, rekap |

State memakai React state dan satu context untuk user login; tidak ada library state global. Echo dibuat sekali per tab dan diputus saat logout.

### Performa scene 3D

Di laptop Key (GPU Intel terintegrasi), `/gedung` dengan dua kelas penuh sempat cuma 4,5 FPS: sekitar 1.200 draw call dan 410 ribu segitiga per frame. Karena itu geometri digabung saat model dimuat:

- Benda statis gedung jadi satu mesh per ruangan dan material, dari 386 jadi 119 mesh. Dinding, kusen, pintu, dan layar laptop tetap objek sendiri karena disembunyikan, diputar, dipakai raycast, atau diwarnai per kursi.
- Tiap avatar jadi satu SkinnedMesh berwarna per vertex, dari 36 jadi 1 mesh. Tiap bagian ikut tulang induknya dengan bobot penuh, jadi geraknya sama persis dengan bagian aslinya (dicek di `model.test.ts`).
- Hitbox avatar tidak digambar. Raycast three.js tetap mengenai objek yang `visible` false.

Hasilnya di browser yang sama, dengan ukuran canvas yang sama dan 23 avatar: 144 FPS (mentok refresh rate layar) dan 135 draw call per frame. Jumlah segitiga tetap sekitar 390 ribu. Kursi menyumbang sekitar dua pertiga segitiga gedung (3.008 segitiga per kursi, 41 kursi), jadi kursi yang disederhanakan di Blender kalau nanti laptop lain masih lambat.

Akibatnya untuk aset: semua material avatar harus sama selain warnanya (sekarang roughness 0,7, tanpa metal, tanpa tekstur), dan objek bernama di gedung (titik, dinding, pintu, laptop, furnitur) harus anak langsung empty ruangannya.

Daun pintu di `gedung.glb` dimodelkan terbuka 90 derajat ke dalam ruangan, satu objek dengan kusennya. Web memindahkan daun dan gagang ke pivot di engselnya, menutupnya saat dimuat, lalu membukanya saat ada avatar lewat atau koordinator menekan E di mode Jelajah. Kusen tetap diam.

## Dependensi

| Paket | Versi | Alasan |
| --- | --- | --- |
| `laravel-echo` | 2.6.3 | Klien channel Reverb, sesuai contoh di dokumentasi API |
| `pusher-js` | 8.6.0 | Transport WebSocket yang dipakai Echo untuk broadcaster `reverb` |
| `three` | 0.187.0 | Mesin 3D |
| `@react-three/fiber` | 9.8.2 | three.js sebagai komponen React |
| `@react-three/drei` | 10.7.9 | `useGLTF` dan `OrbitControls`. `three-stdlib` (pointer lock, tipe GLTF, loader di tes) ikut terpasang lewat paket ini |
| `@types/three` (dev) | 0.187.0 | Tipe three.js |
| `vitest` (dev) | 4.1.12 | Tes logika murni. Vitest 5 butuh Node 22.12 ke atas, sedangkan yang terpasang Node 20.19 |

## Riwayat perubahan

### 2026-11-07 · Tahap 1, Aset 3D

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

### 2026-11-08 · Tahap A, pondasi dan mode daftar

File baru:

- `.env.example`: empat variabel di bagian Variabel env.
- `lib/types.ts`, `lib/api.ts`, `lib/echo.ts`, `lib/use-classroom.ts`, `lib/presence.ts`, `lib/role.ts`: lihat Struktur kode.
- `lib/presence.test.ts`, `lib/role.test.ts`: tes Vitest untuk penggabungan event, label, format waktu, halaman awal, dan cek staf.
- `app/login/page.tsx`: login koordinator.
- `app/masuk/page.tsx`, `app/masuk/tukar-token.tsx`: link masuk dari agent. Token cuma dikirim sekali walau Strict Mode menjalankan effect dua kali.
- `app/(app)/layout.tsx`, `app/(app)/session.tsx`: pengaman halaman, context user, header dengan status realtime dan logout.
- `app/(app)/page.tsx`: pengarahan per role.
- `app/(app)/gedung/page.tsx`: tab kelas dan mode daftar untuk koordinator.
- `app/(app)/kelas/[slug]/page.tsx`: mode daftar untuk anggota dan ketua kelas.
- `components/daftar-presence.tsx`: ringkasan jumlah per keadaan, koordinator yang berkunjung, dan tabel presence yang berubah realtime. Kolom lama dihitung dari `state_since` dan diperbarui tiap 15 detik.

File diubah:

- `package.json`, `package-lock.json`: dependensi di bagian Dependensi dan skrip `test`.
- `app/layout.tsx`: judul, bahasa `id`.
- `app/globals.css`: warna "denah terang", latar kertas berkotak, utilitas `tombol`, `label-mono`, dan `tag`.
- `next.config.ts`: `allowedDevOrigins` dari host `NEXT_PUBLIC_API_URL` untuk demo lewat IP.
- `.gitignore`: `.env.example` ikut di-commit, `AGENTS.md` diabaikan. Key menjalankan `git rm --cached AGENTS.md` sebelum commit.
- `README.md`: diganti ringkasan proyek.
- `dokumentasi.md`: ditambah bagian acuan di atas Riwayat perubahan.

Dihapus:

- `app/page.tsx`: diganti `app/(app)/page.tsx`.

### 2026-11-08 · Tahap B sampai D, scene 3D, panel role, dan interaksi

File baru:

- `lib/kursi.ts`, `lib/use-rooms.ts`: lihat Struktur kode.
- `lib/scene/graf.ts`, `lib/scene/gerak.ts`, `lib/scene/keadaan.ts`, `lib/scene/tampilan.ts`: logika scene tanpa three.js, lihat Struktur kode.
- `lib/scene/scene.test.ts`: tes rute, gerak, tujuan per keadaan, rakitan avatar, dan kode kursi. Titiknya dibaca langsung dari `gedung.glb`.
- `components/scene/scene.tsx`, `components/scene/dunia.ts`, `components/scene/avatar.tsx`, `components/scene/jelajah.tsx`, `components/scene/pratinjau.tsx`: lihat Struktur kode.
- `components/toggle-mode.tsx`, `components/daftar-ringkas.tsx`, `components/detail-presence.tsx`: tombol 3D atau daftar, daftar sempit di samping scene, dan detail peserta.
- `components/panel-ketua.tsx`: panel ketua kelas, dipakai juga koordinator di Kelola.
- `components/pemilih-avatar.tsx`, `app/(app)/avatar/page.tsx`: pemilih avatar.
- `app/(app)/kelola/page.tsx`, `components/kelola/kelas-jadwal.tsx`, `components/kelola/aturan-aplikasi.tsx`, `components/kelola/rekap.tsx`: dashboard Kelola koordinator. Rekap menampilkan durasi sebagai teks di samping batang, karena kontras kuning istirahat di latar terang di bawah 3:1.
- `components/pengumuman.tsx`, `components/form-pengumuman.tsx`: pengumuman di atas ruangan dan form koordinator. Yang tampil cuma pengumuman yang datang lewat `AnnouncementSent` selama halaman terbuka, karena API belum punya daftar pengumuman.
- `components/angkat-tangan.tsx`: peserta angkat dan turunkan tangan.
- `app/not-found.tsx`: halaman 404.

File diubah:

- `package.json`, `package-lock.json`: `three`, `@react-three/fiber`, `@react-three/drei`, dan `@types/three`.
- `lib/types.ts`, `lib/presence.ts`, `components/daftar-presence.tsx`: tipe dan label untuk scene. `subAktivitas` ada di `lib/presence.ts` supaya mode daftar tidak ikut memuat three.js.
- `app/(app)/page.tsx`: login pertama diarahkan ke `/avatar`.
- `app/(app)/session.tsx`: setter user untuk pemilih avatar dan tautan ubah avatar di header.
- `app/(app)/gedung/page.tsx`, `app/(app)/kelas/[slug]/page.tsx`: scene 3D, tombol mode, kunjungan, Jelajah, pengumuman, panel ketua, dan angkat tangan.
- `eslint.config.mjs`: aturan `react-hooks/immutability` dimatikan khusus `components/scene/`, karena scene three.js memang diubah langsung tiap frame.
- `next.config.ts`: `experimental.instantInsights` dengan `validationLevel: "manual-warning"`, karena halaman memuat datanya di browser lewat sesi Laravel.

Dihapus:

- `lib/use-classroom.ts`: diganti `lib/use-rooms.ts`.

### 2026-11-08 · Performa scene, layar laptop, dan pintu

File baru:

- `components/scene/model.test.ts`: memuat .glb langsung. Gedung digabung tanpa kehilangan segitiga, dinding, pintu, dan layar laptop tetap objek sendiri, pintu mulai tertutup di dalam kusennya, dan avatar gabungan bergerak sama dengan bagian aslinya di tengah klip `duduk_ngetik`.
- `vitest.config.mts`: alias `@/` untuk tes.

File diubah:

- `components/scene/dunia.ts`: penggabungan geometri gedung (lihat Performa scene 3D). Objek bernama cuma dibaca dari anak langsung empty ruangan. Sebelumnya anak mesh layar bernama `laptop_3` ikut cocok dengan pola `^laptop_`, jadi material layar per kursi tertimpa salinan lain dan warna layar laptop tidak pernah berubah. Pintu dipisah jadi kusen yang diam dan daun di pivot engsel, dan mulai tertutup. Sebelumnya seluruh objek pintu, termasuk kusen, diputar pada tepi barat kotaknya.
- `components/scene/avatar.tsx`: avatar jadi satu SkinnedMesh berwarna per vertex. Hook `useAvatar` menggantikan `useKlip` dan membuang geometri saat rakitan berganti. Hitbox tidak digambar, dan avatar yang sudah pergi tidak bisa diklik.
- `components/scene/pratinjau.tsx`: memakai `useAvatar`.
- `components/scene/scene.tsx`: pintu memakai sudut tertutup dari `dunia.ts`, dan bidikan Jelajah cuma ke avatar yang tampil.
- `dokumentasi.md`: halaman, struktur kode, performa, dan dependensi untuk Tahap B sampai D.

### 2026-11-08 · Revisi mode Jelajah

Atas permintaan Key.

File diubah:

- `components/scene/jelajah.tsx`: pintu terdekat dalam jangkauan E (1,8 m dari tengah lubang pintu) dilaporkan ke scene untuk prompt. Posisi dan arah pandang disimpan tiap frame selama pointer terkunci, lalu dipakai lagi saat masuk Jelajah berikutnya; sebelumnya selalu mulai dari `wp_koordinator_1`. Simpanannya di level modul, jadi bertahan walau pindah ke mode daftar, dan hilang saat halaman dimuat ulang. Penyimpanan dilakukan tiap frame, karena `OrbitControls` drei sudah memutar kamera ke targetnya saat dirender, sebelum cleanup Jelajah jalan.
- `components/scene/scene.tsx`: prompt "Tekan E untuk Membuka" atau "Tekan E untuk Menutup" di bawah crosshair, dengan E sebagai tombol kotak. Bidikan dan prompt selalu dilaporkan ulang di frame pertama sesudah Jelajah dipasang lagi, supaya tidak tersisa keadaan lama.

### 2026-11-08 · Revisi mode Jelajah kedua

Atas laporan Key.

File diubah:

- `components/scene/jelajah.tsx`:
  - Prompt pintu dan tombol E cuma berlaku untuk pintu dalam jarak 1,5 m dari tengah lubang pintu yang ada di depan pandangan, paling jauh 60 derajat dari arah depan. Pengecualiannya kalau pemain berdiri di ambang pintu. Tombol E memakai pintu yang sedang ditampilkan prompt. Sebelumnya pintu dipilih cuma dari jarak 1,8 m, sehingga di lorong E bisa membuka pintu lain di belakang atau samping pemain.
  - Tepi badan di arah gerak harus tetap di atas lantai salah satu ruangan (`ruangDi`). Dinding utara Data Science dan Developer punya lubang jendela setinggi 0,77 sampai 2,50 m, dan pintu gedung di ujung timur lorong tidak punya daun pintu. Sinar tabrakan setinggi 1 m lolos lewat lubang-lubang itu, jadi pemain bisa keluar gedung.
  - Klik kiri ke avatar langsung mengganti detail tanpa melepas pointer, jadi menu jeda tidak muncul lagi. Klik kanan tidak memilih avatar.
- `components/scene/scene.tsx`: petunjuk saat pointer terkunci ditambah "klik avatar untuk detail".

### 2026-11-08 · Pengumuman hari ini

Atas permintaan Key, memakai endpoint baru `GET /api/classrooms/{slug}/announcements`.

File diubah:

- `lib/use-rooms.ts`: pengumuman hari ini diambil dari API saat halaman dibuka dan tiap langganan channel kelas berhasil, lalu digabung dengan yang datang lewat `AnnouncementSent`. Pengumuman yang ditutup cuma disembunyikan dari banner, jadi tidak muncul lagi saat daftar dimuat ulang. Muncul lagi kalau halaman di-refresh. Hook ini juga mengembalikan `riwayatPengumuman`, isinya semua pengumuman hari ini.
- `lib/presence.ts`, `lib/presence.test.ts`: `applyAnnouncements`, penggabungan tanpa dobel dengan pengumuman terbaru di atas, beserta tesnya.
- `components/form-pengumuman.tsx`: daftar "Terkirim hari ini" di bawah form koordinator.
- `components/pengumuman.tsx`: komentar disesuaikan.
- `app/(app)/gedung/page.tsx`: riwayat diteruskan ke form pengumuman.

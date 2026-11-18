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
| `NEXT_PUBLIC_REVERB_SCHEME` | `http` (default) atau `https`. Cuma `https` yang membuat Echo memakai wss; tidak ada bagian lain yang memaksa TLS |

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

### Uji alur peserta dengan agent sungguhan

```bash
cd ../kelas3d-agent && ./sajikan.sh localhost
```

Lalu sebagai koordinator: Kelola, tab Anggota & ketua, "Buat perintah install" di nama peserta, tempel perintah macOS/Linux di terminal, dan jalankan `kelas3d buka`. Link dari `kelas3d buka` terbuka di browser bawaan dan sesi peserta menimpa sesi koordinator di browser yang sama, jadi buka koordinator di jendela private atau browser lain. Sesudah selesai: `kelas3d uninstall`, dan revoke laptopnya di panel.

### Uji lihat layar

Butuh `composer dev` di API (Reverb harus hidup) dan akun uji dari `php artisan db:seed --class=AkunUjiSeeder`. Email dan password-nya ada di `kelas3d-api/dokumentasi.md` bagian Akun uji. Tanpa agent, akun uji berstatus keluar dan avatarnya tidak tampil, jadi pilih mahasiswanya dari daftar di panel kanan Gedung (tab Data Science).

Satu laptop, tiga profil browser (sesi web berupa cookie, jadi satu profil cuma bisa satu akun; jendela samaran dihitung satu profil sendiri):

1. Buka `http://localhost:3000/login` di tiga profil, masuk sebagai koordinator, ketua, dan mahasiswa. Di localhost browser mengizinkan berbagi layar tanpa pengaturan tambahan.
2. Koordinator: Gedung, tab Data Science, klik Mahasiswa Uji, isi alasan, "Minta lihat layar". Avatar koordinator berjalan ke meja ketua, dan kartu status muncul di kiri bawah.
3. Ketua: kartu di kiri bawah, Setujui.
4. Mahasiswa: kartu di kiri bawah, Izinkan, lalu pilih layar atau jendela di pemilih browser.
5. Koordinator melihat layarnya di kartu (ada tombol Perbesar). Mahasiswa melihat penanda merah di atas halaman. Ketiganya bisa menghentikan.
6. Coba juga: Tolak di ketua atau mahasiswa, tutup pemilih layar, biarkan 60 detik tanpa jawaban, tutup tab mahasiswa saat live (sesi berakhir sekitar 8 detik kemudian), tutup tab ketua lalu minta lagi (ditolak dengan pesan ketua tidak membuka web), dan tab Layar di panel ketua untuk log-nya.

Tiga laptop di jaringan yang sama: ikuti Demo di jaringan kelas di bawah. Alamat `http://<IP>:3000` bukan konteks aman, jadi di laptop mahasiswa Chrome menolak berbagi layar sampai alamat itu didaftarkan:

1. Buka `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
2. Isi kotaknya dengan `http://<IP>:3000`, pilih Enabled, lalu Relaunch.

Yang wajib cuma laptop mahasiswa (yang membagikan layar); laptop koordinator dan ketua tidak butuh flag. Kalau kartu berhenti di "Menyambungkan" lalu kedaluwarsa, kedua browser tidak menemukan jalur langsung. Coba matikan `chrome://flags/#enable-webrtc-hide-local-ips-with-mdns` di kedua laptop, atau tambahkan server TURN lewat `ICE_SERVERS` di `.env` API.

### Uji antrean bantuan dan share layar sukarela

Sama seperti Uji lihat layar: `composer dev`, akun uji, dan tiga profil browser di localhost. Tombol angkat tangan ada di halaman kelas mahasiswa, dan bisa dipakai walau akun uji berstatus keluar.

1. Mahasiswa: buka halaman kelasnya, "✋ Angkat tangan", isi catatan.
2. Koordinator (Gedung) dan ketua (halaman kelas): antrean bantuan muncul di panel kanan, tab kelasnya diberi ✋ dan jumlahnya. Klik baris antrean untuk membuka detail, lalu Tangani.
3. Mahasiswa: tag berubah jadi "Dibantu <nama>", lalu "Bagikan layar" dan pilih layar. Tanpa langkah ketua kelas.
4. Penanganannya melihat layar di kartu kiri bawah, mahasiswa melihat penanda merah. Kalau yang menangani koordinator, ketua kelas tidak mendapat kartu.
5. Coba juga: Selesai di detail peserta (share ikut berhenti), tutup web penanganannya lalu Bagikan layar (ditolak dengan pesan), dan tab Layar di panel ketua (tercatat "membagikan layar ke ... saat minta bantuan").

## Demo di jaringan kelas

Laptop Key jadi server, laptop peserta tersambung lewat WiFi kampus yang sama, dan agent diunduh dari laptop Key (tanpa internet dan tanpa GitHub Releases). Semua alamat memakai IP laptop Key, termasuk saat dibuka dari laptop Key sendiri, karena CORS API cuma menerima satu origin (`FRONTEND_URL`). Contoh di bawah memakai `192.168.1.11`.

1. Sambungkan laptop ke WiFi kelas, lalu cari IP-nya: `ip -4 -o addr show scope global`. IP bisa berubah tiap ganti WiFi atau sambung ulang, jadi kerjakan di lokasi dan jangan putuskan WiFi selama demo.
2. `.env` API:

   ```env
   APP_URL=http://192.168.1.11:8000
   FRONTEND_URL=http://192.168.1.11:3000
   SANCTUM_STATEFUL_DOMAINS=192.168.1.11:3000
   SERVER_HOST=0.0.0.0
   ```

   `SERVER_HOST` membuat `php artisan serve` (bagian dari `composer dev`) mendengarkan di semua antarmuka, bukan cuma `127.0.0.1`. Reverb sudah mendengarkan di `0.0.0.0` dari awal (`REVERB_SERVER_HOST`) dan menerima origin mana pun, sedangkan `REVERB_HOST=localhost` tetap, karena itu alamat yang dipakai Laravel sendiri untuk mengirim event. `SESSION_DOMAIN=null` membuat cookie sesi berlaku untuk host IP itu di port 3000 maupun 8000. Perintah install dan link masuk ikut memakai `APP_URL` dan `FRONTEND_URL` ini. Kalau config pernah di-cache, jalankan `php artisan config:clear`.
3. `.env.local` web:

   ```env
   NEXT_PUBLIC_API_URL=http://192.168.1.11:8000
   NEXT_PUBLIC_REVERB_HOST=192.168.1.11
   ```

4. Agent untuk IP itu, disajikan dari API: `./sajikan.sh 192.168.1.11` di `kelas3d-agent` (lihat `kelas3d-agent/dokumentasi.md` bagian Menyajikan dari server API).
5. Jalankan:

   ```bash
   cd ../kelas3d-api && composer dev
   npm run build && npx next start -H 0.0.0.0
   ```

   `next start` lebih ringan untuk presentasi. Kalau mau `next dev`, pakai `npx next dev -H 0.0.0.0`; `allowedDevOrigins` di `next.config.ts` otomatis berisi host dari `NEXT_PUBLIC_API_URL`, jadi dev server menerima akses lewat IP itu.
6. Cek dari HP atau laptop lain di WiFi yang sama: buka `http://192.168.1.11:8000/up`, lalu `http://192.168.1.11:3000/login`. Kalau dari laptop Key terbuka tapi dari perangkat lain tidak, WiFi kampus memblokir koneksi antarperangkat (isolasi klien). Pindahkan semua laptop ke hotspot HP, lalu ulangi dari langkah 1 dengan IP baru.
7. Port 3000 (web), 8000 (API), dan 8080 (Reverb) harus terbuka. Di laptop Key saat ini tidak ada firewall yang aktif (ufw, firewalld, dan nftables mati). Kalau nanti dinyalakan, contoh untuk ufw: `sudo ufw allow 3000,8000,8080/tcp`.
8. Pastikan jam presentasi ada di jadwal `kelas` kedua kelas (Kelola, tab Kelas & jadwal), karena agent diam di luar jadwal. Jadwal bawaan Senin–Jumat 08.00–16.00 dengan istirahat 12.00–13.00 (Jumat 11.30–13.00); selama istirahat semua avatar pindah ke beanbag dan titik berdiri.
9. Masuk sebagai koordinator di `http://192.168.1.11:3000/login`, buat perintah install untuk tiap peserta (Kelola atau panel ketua kelas), lalu peserta menempelnya di PowerShell atau terminal. Pastikan header menampilkan "Realtime tersambung". Tambahkan semua peserta dan buka Gedung sebelum mereka menempel perintah: avatar cuma terlihat jalan masuk dari pintu gedung kalau halamannya sudah terbuka saat heartbeat pertama datang. Avatar yang sudah di kelas saat halaman dibuka langsung tampil di tujuannya, dan anggota yang ditambahkan sesudah halaman dibuka baru muncul setelah halaman dimuat ulang.

Alamat server tertanam di biner dan tersimpan di agent saat login. Kalau IP laptop Key berubah sesudah peserta terpasang, ulangi langkah 2 sampai 5, lalu peserta memasang ulang dengan kode baru.

## Struktur kode

| File | Isi |
| --- | --- |
| `lib/types.ts` | Semua tipe respons dan payload event dari API |
| `lib/api.ts` | Pembungkus `fetch`: cookie, `Accept`, `X-XSRF-TOKEN`, dan `ApiError` |
| `lib/echo.ts` | Satu koneksi Echo ke Reverb, otorisasi channel lewat sesi web, dan `useEchoStatus` |
| `lib/use-rooms.ts` | Presence dan pengumuman hari ini untuk beberapa kelas sekaligus: REST lalu event di channel tiap kelas. Staf ikut channel `.staff` untuk teguran |
| `lib/presence.ts` | Penggabungan event ke daftar, label, dan format waktu (dites) |
| `lib/role.ts` | Halaman awal per role dan cek staf kelas (dites) |
| `lib/webrtc.ts` | Satu koneksi WebRTC antara dua browser, tanpa tahu soal Echo atau sesi; signaling dititipkan lewat fungsi kirim dan terima, jadi bisa dipakai ulang untuk share layar jenis lain |
| `lib/layar.ts` | Logika sesi lihat layar: penggabungan event, peran, keterangan status, sisa waktu, dan adegan ke meja ketua (dites) |
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
| `components/antrean-bantuan.tsx` | Antrean angkat tangan untuk koordinator dan ketua kelas: belum ditangani dulu, lalu urut waktu; klik membuka detail peserta |
| `components/panel-ketua.tsx` | Anggota dan kursi, perintah install agent, laptop, dan teguran |
| `components/layar/penyedia.tsx` | State lihat layar untuk semua halaman: REST dan event di channel `user.{id}`, plus koneksi WebRTC tiap sesi, termasuk share sukarela dari antrean bantuan (`bagikan`). Dipasang di `Session` |
| `components/layar/kartu-layar.tsx` | Kartu di kiri bawah untuk koordinator (tahap dan video), ketua (Setujui, Tolak), dan mahasiswa (Izinkan, Tolak), serta penanda "layarmu sedang dilihat" |
| `components/mode-fokus.tsx` | Tombol mode fokus peserta dan jumlah pengumuman yang ditahan |
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

### 2026-11-09 · Persiapan uji agent dan demo

Keputusan Key: agent disajikan dari laptop server lewat `kelas3d-agent/sajikan.sh`, dan presentasi memakai WiFi kampus.

File diubah:

- `dokumentasi.md`: langkah demo di jaringan kelas disusun ulang (agent dari `sajikan.sh`, cek isolasi klien WiFi kampus dengan `/up`, cadangan hotspot HP, cek jadwal, apa yang diulang kalau IP berubah), dan cara menguji alur peserta dengan agent sungguhan di laptop sendiri.

### 2026-11-09 · Avatar berdiri di Gedung koordinator

Ditemukan saat uji dengan agent sungguhan: di Gedung koordinator (denah dan Jelajah) avatar ketua kelas berdiri di depan kursinya, padahal di halaman kelasnya sendiri avatar yang sama mengetik. Avatar yang dibuat langsung di tujuannya memutar klipnya sekali di konstruktor `Gerak`. Strict Mode di `next dev` (diteruskan R3F ke dalam Canvas) memasang efek dua kali, dan cleanup `useAvatar` menghentikan semua klip. Saat dipasang lagi, `play()` mengira klip yang sama masih jalan, jadi avatar diam di pose dasar sampai klipnya berganti. Pola bongkar-pasang yang sama kemungkinan juga terjadi di `next start` saat halaman disembunyikan lalu ditampilkan lagi lewat React `Activity` (`cacheComponents`), misalnya Gedung, Kelola, lalu Gedung lagi.

File diubah:

- `components/scene/avatar.tsx`: cleanup `useAvatar` juga mengosongkan klip terakhir, supaya `play()` berikutnya memutar ulang klipnya. Berlaku juga untuk pratinjau pemilih avatar.
- `dokumentasi.md`: langkah 9 Demo di jaringan kelas, buka Gedung sebelum peserta menempel perintah supaya avatar terlihat jalan masuk.

### 2026-11-09 · Daftar aplikasi yang terbuka

Panel detail peserta (koordinator dan ketua kelas) punya baris "Juga terbuka": aplikasi lain yang jendelanya terbuka di laptop peserta, terakhir dipakai dulu, dengan kotak warna kategori yang sama dengan warna layar laptop di scene. Datanya dari `open_apps` di `GET /api/classrooms/{slug}/presences`, dan ikut segar lewat pengambilan ulang detail staf sesudah `PresenceChanged` yang sudah ada.

File diubah:

- `lib/types.ts`: `OpenApp` dan `Presence.open_apps`.
- `lib/scene/keadaan.ts`: `LAYAR` diekspor.
- `components/detail-presence.tsx`: baris "Juga terbuka".

Tes: `npx tsc --noEmit`, `npx eslint` untuk file yang berubah, `npx vitest run` (36 tes) lulus. `npm run build` belum dijalankan karena `next start` sedang memakai `.next`; tampilan belum dicek di browser.

### 2026-11-10 · Lihat layar mahasiswa (Fitur A)

Koordinator memilih mahasiswa (klik avatar atau dari daftar), mengisi alasan, lalu permintaannya lewat ketua kelas dan izin mahasiswa sebelum layar tampil lewat WebRTC. Kontraknya ada di `kelas3d-api/dokumentasi.md` bagian Lihat layar.

Cara kerjanya di web:

- `LayarProvider` mendengar channel `user.{id}` dari halaman mana pun. Channel itu juga yang membuat server tahu web seseorang sedang terbuka.
- Mahasiswa menekan Izinkan, browser membuka pemilih layar (`getDisplayMedia` dipanggil langsung dari klik), baru sesudah itu API diberi tahu. Kedua browser lalu bergabung ke `presence-screen.{id}` dan bertukar whisper `sinyal`. Mahasiswa mengirim tawaran tiap koordinator muncul di channel.
- Sesi berakhir kalau salah satu pihak menghentikan, tombol "Berhenti berbagi" browser ditekan, koneksi WebRTC gagal, atau ujung satunya hilang dari channel lebih dari 8 detik. Mahasiswa yang memuat ulang halaman di tengah sesi otomatis mengakhirinya, karena stream tidak bisa diambil lagi tanpa klik.
- Selama menunggu ketua, avatar koordinator berdiri di belakang kursi ketua dengan balon berisi permintaannya (adegan yang sama dengan teguran). Koordinator otomatis berkunjung ke kelas itu dulu. Adegan cuma terlihat koordinator peminta dan ketua kelas.

File baru:

- `lib/webrtc.ts`, `lib/layar.ts`, `lib/layar.test.ts`: lihat Struktur kode.
- `components/layar/penyedia.tsx`, `components/layar/kartu-layar.tsx`: lihat Struktur kode.

File diubah:

- `lib/types.ts`: `ScreenSession`, `ScreenStatus`, `ScreenCloseReason`; `Orang` diekspor.
- `lib/echo.ts`: `forceTLS` dari `NEXT_PUBLIC_REVERB_SCHEME` (default `http`), transport `ws` dan `wss`.
- `lib/scene/keadaan.ts`, `components/scene/scene.tsx`: tipe `Adegan` yang dipakai teguran dan lihat layar.
- `app/(app)/session.tsx`: memasang `LayarProvider` dan `KartuLayar`.
- `components/detail-presence.tsx`: form "Lihat layar lewat ketua kelas" untuk koordinator, dan status sesi yang sedang berjalan.
- `components/panel-ketua.tsx`: tab Layar berisi log lihat layar kelas itu.
- `app/(app)/gedung/page.tsx`, `app/(app)/kelas/[slug]/page.tsx`: permintaan lihat layar dan adegannya.
- `.env.example`: `NEXT_PUBLIC_REVERB_SCHEME`.
- `dokumentasi.md`: variabel env, Uji lihat layar, struktur kode.

Tes: `npx vitest run` (42 tes, 6 baru di `lib/layar.test.ts`), `npx tsc --noEmit`, `npx eslint lib components "app/(app)"`, dan `npm run build` bersih. Belum dicoba di browser: seluruh alur WebRTC (pemilih layar, video, putus koneksi) menunggu Key.

Batasan: koordinator kedua tidak melihat adegan ke meja ketua; sambungan realtime yang putus lebih dari 8 detik mengakhiri sesi; stream belum tampil di monitor 3D (tidak dikerjakan).

### 2026-11-10 · Mode fokus

Tombol "🎧 Fokus" di halaman kelas, di sebelah angkat tangan. Selama fokus, avatar peserta itu memakai headphone dan labelnya diberi 🎧 (terlihat semua yang melihat ruangan), mode daftar menampilkan tag Fokus, dan banner pengumuman di layarnya ditahan dengan keterangan jumlahnya. Begitu fokus selesai, pengumuman yang belum ditutup tampil lagi. Kartu lihat layar dan teguran tidak ikut ditahan.

Headphone-nya sementara dari lima balok (bando, dua tangkai, dua bantalan oranye) yang dibuat di kode dan digabung ke mesh avatar di tulang `kepala`, diukur dari kotak kepala dan rambut yang dipakai supaya tidak tenggelam di rambut atau hijab. Kalau aset aslinya sudah ada di `avatar.blend`, fungsi `headphone` di `components/scene/avatar.tsx` diganti aturan tampil di `bagianTampil`.

Tombolnya cuma aktif kalau peserta sedang di kelas atau istirahat, jadi untuk mencobanya butuh agent yang jalan di jam kelas (akun uji tanpa agent berstatus keluar). Untuk akun uji: buat perintah install untuk Mahasiswa Uji di Kelola, tempel di terminal, lalu masuk sebagai mahasiswa itu.

File baru:

- `components/mode-fokus.tsx`.

File diubah:

- `lib/types.ts`, `lib/presence.ts`: `focus` di presence dan event `PresenceChanged`.
- `lib/scene/tampilan.ts`: `Rakitan.fokus`.
- `components/scene/avatar.tsx`: headphone, dan penempelan potongan ke tulang dipisah jadi fungsi `tempel`.
- `components/scene/scene.tsx`: 🎧 di label dan rakitan dengan `fokus`.
- `components/daftar-presence.tsx`: tag Fokus.
- `app/(app)/kelas/[slug]/page.tsx`: tombol fokus dan banner yang ditahan.
- `lib/presence.test.ts`, `lib/scene/scene.test.ts`, `components/scene/model.test.ts`: fixture dan tes baru (headphone menempel di tulang kepala, di atas ubun-ubun, simetris).

Tes: `npx vitest run` (44 tes), `npx tsc --noEmit`, `npx eslint lib components "app/(app)"`, dan `npm run build` bersih. Tampilan headphone dan tombolnya belum dicek di browser.

### 2026-11-12 · Antrean bantuan dan share layar sukarela (Fitur B)

Antrean angkat tangan untuk koordinator dan ketua kelas, dan peserta yang sedang dibantu bisa membagikan layarnya sendiri ke yang menangani. Share sukarela memakai `lib/webrtc.ts` dan alur kartu lihat layar yang sama, tanpa langkah ketua. Kontraknya di `kelas3d-api/dokumentasi.md` bagian Angkat tangan.

Cara kerjanya di web:

- Peserta menekan "Bagikan layar": pemilih layar dibuka dulu dari klik, baru `POST /api/help-requests/{id}/screen-session`. Sesinya langsung `menyambung`, lalu `siarkan` (bagian pengirim yang dipisah dari `izinkan`) bergabung ke channel signaling.
- Antrean: yang belum ditangani dulu, lalu urut waktu angkat tangan (`antreanBantuan` di `lib/presence.ts`). Waktu dibandingkan sebagai tanggal karena REST memakai UTC dan event +07:00. Di Gedung antreannya untuk tab kelas yang aktif, dan tab kelas lain diberi ✋ dengan jumlahnya. Di halaman kelas, panel kanan muncul sendiri untuk staf selama antrean ada isinya.
- Kartu dan penanda untuk share sukarela: label "Bantuan", judul "Kamu membagikan layar ke …", tanpa langkah Ketua dan Mahasiswa, dan penanda "Layarmu sedang dilihat <nama>" tanpa kata koordinator karena penontonnya bisa ketua kelas.

File baru:

- `components/antrean-bantuan.tsx`.

File diubah:

- `lib/types.ts`: `HelpRequestOpen` (dengan `handled_by` dan `created_at`), `HelpRequestedEvent.created_at`, `ScreenSession.help_request_id`.
- `lib/presence.ts`: `applyHelpRequested` membawa penanganan, `antreanBantuan`.
- `components/layar/penyedia.tsx`: `pilihLayar` dan `siarkan` dipisah dari `izinkan`, ditambah `bagikan`.
- `components/layar/kartu-layar.tsx`: teks untuk share sukarela.
- `components/angkat-tangan.tsx`: "Dibantu <nama>" dan tombol "Bagikan layar".
- `components/detail-presence.tsx`: nama penangan.
- `components/panel-ketua.tsx`: log Layar membedakan share sukarela.
- `app/(app)/gedung/page.tsx`: antrean di panel kanan, ✋ di tab kelas.
- `app/(app)/kelas/[slug]/page.tsx`: antrean untuk staf di panel kanan.
- `lib/presence.test.ts`, `lib/layar.test.ts`, `lib/scene/scene.test.ts`: fixture field baru dan tes urutan antrean.

Tes: `npx vitest run` (45 tes, 1 baru), `npx tsc --noEmit`, `npx eslint app components lib`, dan `npm run build` bersih. Belum dicek di browser.

### 2026-11-18 · Progresku (Fitur B)

Halaman `/progres` untuk peserta (termasuk ketua kelas), dari `GET /api/progress`. Tiga angka (aktif dan ngoding untuk hari, minggu, atau bulan ini, plus streak sekarang dan terbaik) dan grafik batang yang bisa dipindah Hari (14 hari), Minggu (8 minggu mulai Senin), atau Bulan (3 bulan). Batang ngoding hitam, sisa waktu aktif hijau. Tanpa perbandingan dengan teman.

File baru:

- `lib/progres.ts`: tipe `Progress`, `kelompokkan` (menjumlah hari ke hari, minggu, atau bulan, hari kosong tetap tampil), `hariIniJakarta`.
- `lib/progres.test.ts`: 3 tes (14 hari, minggu lewat batas bulan, bulan lewat pergantian tahun).
- `app/(app)/progres/page.tsx`: halaman Progresku.

File diubah:

- `app/(app)/session.tsx`: navigasi Kelas dan Progresku di header untuk role peserta.

Tes: `npx vitest run` (48 tes, 3 baru), `npx tsc --noEmit`, `npx eslint` untuk file yang berubah, dan `npm run build` bersih. Belum dicek di browser.

### 2026-11-18 · XP dan aksesoris (Fitur B)

Kartu Level di bawah Progresku: level, XP, bilah menuju level berikutnya, dan pilihan aksesoris per slot (Topi, Item meja). Yang belum terbuka bertanda 🔒 dengan level yang dibutuhkan. Memilih aksesoris memanggil `PUT /api/aksesoris` lalu memperbarui `me`, jadi pratinjau avatar langsung ikut.

Bentuk aksesoris di 3D masih sementara, sampai asetnya dibuat di Blender:

- Topi menempel ke tulang kepala lewat `buatAvatar`, sama seperti headphone, jadi tetap satu draw call per avatar. `topi_1` kubah biru dengan lidah ke depan, `topi_2` kubah hijau dengan pompom. Kalau headphone dipakai juga, bandonya tertutup topi.
- Item meja ditaruh di sebelah kanan laptop kursi pemiliknya (`components/scene/item-meja.tsx`). Posisinya dari kotak laptop yang sekarang dicatat di `Dunia.laptop`, dengan arah dari yaw titik `seat_`. `meja_1` mug, `meja_2` pot tanaman. Item cuma tampil di ruangan yang sedang ditampilkan.
- Avatar sendiri di scene kelas memakai `user.avatar` dari presence, jadi topi baru terlihat di sana sesudah halaman kelas dimuat ulang.

File baru:

- `components/scene/item-meja.tsx`.

File diubah:

- `lib/types.ts`: `Avatar.aksesoris`.
- `lib/progres.ts`: tipe `Aksesoris`, `SlotAksesoris`, serta `xp`, `aksesoris`, dan `dipakai` di `Progress`.
- `app/(app)/progres/page.tsx`: kartu Level dan pemilih aksesoris.
- `lib/scene/tampilan.ts`: `Rakitan.topi`.
- `components/scene/avatar.tsx`: topi sementara di tulang kepala.
- `components/scene/dunia.ts`: `laptop` (kotak laptop per kursi).
- `components/scene/scene.tsx`: item meja dari `user.avatar.aksesoris.meja` per kursi.
- `components/scene/model.test.ts`: 3 tes baru (dua topi, termasuk bersama headphone; semua 32 kursi punya laptop di ketinggian meja).

Tes: `npx vitest run` (51 tes), `npx tsc --noEmit`, `npx eslint app components lib`, dan `npm run build` bersih. Belum dicek di browser.

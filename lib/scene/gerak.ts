import { belok, depan, jarak, ruangTitik, rute, selisihYaw, yawOf, type Graf, type Lokasi } from "./graf";
import { sameTujuan, type Klip, type Tujuan } from "./keadaan";

// Aturan main klip di rencana: jalan 1,14 m/s, mundur 0,59 m/s.
export const KECEPATAN = { jalan: 1.14, mundur: 0.59 } as const;
const PUTAR = 3; // rad/detik, untuk sisa sudut sesudah belok
const FADE = 0.25;

export type Step =
  | { type: "show"; at: Lokasi; yaw: number }
  | { type: "walk"; to: Lokasi; back: boolean }
  | { type: "turn"; dir: "kiri" | "kanan" }
  | { type: "face"; yaw: number }
  | { type: "once"; clip: "duduk" | "berdiri"; point?: string }
  | { type: "loop"; clip: Klip }
  | { type: "hide" };

export interface Pose extends Lokasi {
  yaw: number;
  visible: boolean;
  // Nama titik tempat avatar sedang duduk.
  seated: string | null;
}

const lokasiTitik = (graf: Graf, name: string): Lokasi => {
  const t = graf.titik.get(name)!;
  return { x: t.x, z: t.z, room: ruangTitik(name) };
};

export function poseAwal(graf: Graf, tujuan: Tujuan): Pose {
  if (tujuan.kind === "keluar") return { x: 0, z: 0, room: "lorong", yaw: 0, visible: false, seated: null };
  const t = graf.titik.get(tujuan.point)!;
  const at = tujuan.kind === "duduk" ? depan(t) : t;
  return { x: at.x, z: at.z, room: ruangTitik(t.name), yaw: t.yaw, visible: true, seated: tujuan.kind === "duduk" ? t.name : null };
}

// Langkah dari pose sekarang ke tujuan. `pintu` tempat avatar muncul dan menghilang.
export function rencana(graf: Graf, pose: Pose, tujuan: Tujuan, pintu: string): Step[] {
  const steps: Step[] = [];
  const cur = { ...pose };

  if (!cur.visible) {
    if (tujuan.kind === "keluar") return [];
    const d = graf.titik.get(pintu)!;
    const at = lokasiTitik(graf, pintu);
    steps.push({ type: "show", at, yaw: d.yaw });
    Object.assign(cur, at, { yaw: d.yaw, visible: true, seated: null });
  }

  const dariKursi = cur.seated !== null;
  if (cur.seated) {
    if (tujuan.kind === "duduk" && tujuan.point === cur.seated) return [{ type: "loop", clip: tujuan.clip }];
    steps.push({ type: "once", clip: "berdiri" });
  }

  const legs: Lokasi[] = [];
  if (tujuan.kind === "keluar") legs.push(lokasiTitik(graf, pintu));
  else {
    if (tujuan.kind === "berdiri") for (const v of tujuan.via ?? []) legs.push(lokasiTitik(graf, v));
    const t = graf.titik.get(tujuan.point)!;
    legs.push(tujuan.kind === "duduk" ? { ...depan(t), room: ruangTitik(t.name) } : lokasiTitik(graf, t.name));
  }

  let pertama = true;
  for (const leg of legs) {
    const path = rute(graf, cur, leg);
    for (let i = 1; i < path.length; i++) {
      const heading = yawOf(path[i - 1], path[i]);
      // Bangun dari kursi lalu mundur beberapa langkah ke lorong meja, bukan putar balik.
      const back = pertama && dariKursi && Math.abs(selisihYaw(cur.yaw, heading)) > (Math.PI * 3) / 4 && jarak(path[i - 1], path[i]) < 1.5;
      if (!back) {
        for (const dir of belok(cur.yaw, heading)) steps.push({ type: "turn", dir });
        cur.yaw = heading;
      }
      steps.push({ type: "walk", to: path[i], back });
      Object.assign(cur, path[i]);
      pertama = false;
    }
  }

  if (tujuan.kind === "keluar") {
    steps.push({ type: "hide" });
    return steps;
  }
  const t = graf.titik.get(tujuan.point)!;
  for (const dir of belok(cur.yaw, t.yaw)) steps.push({ type: "turn", dir });
  steps.push({ type: "face", yaw: t.yaw });
  if (tujuan.kind === "duduk") steps.push({ type: "once", clip: "duduk", point: t.name });
  steps.push({ type: "loop", clip: tujuan.clip });
  return steps;
}

// Yang digerakkan Gerak: grup avatar dan mixer animasinya.
export interface Badan {
  pose(x: number, z: number, yaw: number): void;
  visible(v: boolean): void;
  // Mengembalikan durasi klip dalam detik.
  play(clip: Klip, opsi: { once?: boolean; fade: number }): number;
}

// Menjalankan langkah satu per satu tiap frame.
export class Gerak {
  pose: Pose;
  private steps: Step[] = [];
  private step: Step | null = null;
  private t = 0;
  private dur = 0;
  private pending = false;

  constructor(
    private graf: Graf,
    private pintu: string,
    private tujuan: Tujuan,
    private badan: Badan,
  ) {
    this.pose = poseAwal(graf, tujuan);
    badan.visible(this.pose.visible);
    badan.pose(this.pose.x, this.pose.z, this.pose.yaw);
    if (tujuan.kind !== "keluar") {
      this.step = { type: "loop", clip: tujuan.clip };
      badan.play(tujuan.clip, { fade: 0 });
    }
  }

  get sedangJalan(): boolean {
    return this.step !== null && this.step.type !== "loop";
  }

  setTujuan(tujuan: Tujuan) {
    if (sameTujuan(tujuan, this.tujuan)) return;
    this.tujuan = tujuan;
    // Belok, duduk, dan berdiri diselesaikan dulu supaya pose tidak meloncat.
    if (this.step?.type === "turn" || this.step?.type === "once") this.pending = true;
    else this.replan();
  }

  private replan() {
    this.pending = false;
    this.steps = rencana(this.graf, this.pose, this.tujuan, this.pintu);
    this.next();
  }

  private next(): void {
    const s = (this.step = this.steps.shift() ?? null);
    this.t = 0;
    if (!s) return;
    const p = this.pose;
    switch (s.type) {
      case "show":
        Object.assign(p, s.at, { yaw: s.yaw, visible: true, seated: null });
        this.badan.visible(true);
        this.badan.pose(p.x, p.z, p.yaw);
        this.badan.play("diam", { fade: 0 });
        return this.next();
      case "hide":
        p.visible = false;
        this.badan.visible(false);
        return this.next();
      case "walk":
        p.room = s.to.room;
        this.badan.play(s.back ? "mundur" : "jalan", { fade: FADE });
        return;
      case "turn":
        this.dur = this.badan.play(s.dir === "kiri" ? "belok_kiri" : "belok_kanan", { once: true, fade: 0.15 });
        return;
      case "face":
        this.badan.play("diam", { fade: FADE });
        return;
      case "once":
        if (s.clip === "berdiri") p.seated = null;
        this.dur = this.badan.play(s.clip, { once: true, fade: 0.2 });
        return;
      case "loop":
        this.badan.play(s.clip, { fade: FADE });
        return;
    }
  }

  update(dt: number) {
    const s = this.step;
    if (!s) return;
    const p = this.pose;
    this.t += dt;

    if (s.type === "walk") {
      const left = jarak(p, s.to);
      const move = (s.back ? KECEPATAN.mundur : KECEPATAN.jalan) * dt;
      if (!s.back && left > 0.01) p.yaw = putar(p.yaw, yawOf(p, s.to), PUTAR * dt);
      if (move >= left) {
        p.x = s.to.x;
        p.z = s.to.z;
        this.badan.pose(p.x, p.z, p.yaw);
        return this.next();
      }
      p.x += ((s.to.x - p.x) / left) * move;
      p.z += ((s.to.z - p.z) / left) * move;
      this.badan.pose(p.x, p.z, p.yaw);
    } else if (s.type === "turn") {
      if (this.t < this.dur) return;
      // Putaran 90 derajat ada di dalam klip; begitu selesai, grup diputar dan langsung ke diam tanpa crossfade.
      p.yaw += s.dir === "kiri" ? Math.PI / 2 : -Math.PI / 2;
      this.badan.pose(p.x, p.z, p.yaw);
      this.badan.play("diam", { fade: 0 });
      if (this.pending) this.replan();
      else this.next();
    } else if (s.type === "face") {
      p.yaw = putar(p.yaw, s.yaw, PUTAR * dt);
      this.badan.pose(p.x, p.z, p.yaw);
      if (Math.abs(selisihYaw(p.yaw, s.yaw)) < 0.01) this.next();
    } else if (s.type === "once") {
      if (this.t < this.dur) return;
      if (s.clip === "duduk") p.seated = s.point ?? null;
      if (this.pending) this.replan();
      else this.next();
    }
  }
}

function putar(dari: number, ke: number, max: number): number {
  const d = selisihYaw(dari, ke);
  return Math.abs(d) <= max ? ke : dari + Math.sign(d) * max;
}


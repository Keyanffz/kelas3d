import { describe, expect, it } from "vitest";
import { applyAnnouncements, applyHelpRequested, applyPresenceChanged, countByState, formatClock, formatDuration } from "./presence";
import type { Presence } from "./types";

function presence(id: number, extra: Partial<Presence> = {}): Presence {
  return {
    member_id: id + 100,
    role: "anggota",
    seat_code: `a${id}`,
    user: { id, name: `Peserta ${id}`, avatar: null },
    state: "di_kelas",
    state_reason: null,
    activity: "ngoding",
    app_label: "VS Code",
    state_since: "2026-11-09T02:00:00.000000Z",
    last_heartbeat_at: "2026-11-09T02:15:20.000000Z",
    help_request: null,
    ...extra,
  };
}

describe("applyPresenceChanged", () => {
  it("cuma mengganti user yang dimaksud", () => {
    const list = [presence(1), presence(2)];
    const next = applyPresenceChanged(list, {
      user_id: 2,
      state: "istirahat",
      state_reason: "idle",
      activity: "browsing",
      app_label: "Firefox",
      state_since: "2026-11-09T09:05:00+07:00",
    });

    expect(next[0]).toBe(list[0]);
    expect(next[1]).toMatchObject({ state: "istirahat", state_reason: "idle", activity: "browsing", app_label: "Firefox" });
    expect(next[1].state_since).toBe("2026-11-09T09:05:00+07:00");
    expect(list[1].state).toBe("di_kelas");
  });

  it("mengosongkan detail kerjaan staf saat keluar", () => {
    const list = [presence(1, { project: "toko-online", file_name: "auth.ts", language: "TypeScript" })];
    const [p] = applyPresenceChanged(list, {
      user_id: 1,
      state: "keluar",
      state_reason: null,
      activity: null,
      app_label: null,
      state_since: "2026-11-09T16:00:00+07:00",
    });

    expect(p).toMatchObject({ state: "keluar", project: null, file_name: null, language: null });
  });

  it("tidak menambah field staf ke presence peserta", () => {
    const [p] = applyPresenceChanged([presence(1)], {
      user_id: 1,
      state: "keluar",
      state_reason: null,
      activity: null,
      app_label: null,
      state_since: "2026-11-09T16:00:00+07:00",
    });

    expect("project" in p).toBe(false);
  });

  it("mengabaikan user yang tidak ada di daftar", () => {
    const list = [presence(1)];
    const next = applyPresenceChanged(list, {
      user_id: 9,
      state: "keluar",
      state_reason: null,
      activity: null,
      app_label: null,
      state_since: "2026-11-09T16:00:00+07:00",
    });

    expect(next).toEqual(list);
  });
});

describe("applyHelpRequested", () => {
  const event = { id: 5, user: { id: 1, name: "Peserta 1" }, note: "Error migrate", handled_by: null };

  it("mengisi permintaan bantuan yang masih terbuka", () => {
    const [p] = applyHelpRequested([presence(1)], { ...event, status: "menunggu" });
    expect(p.help_request).toEqual({ id: 5, note: "Error migrate", status: "menunggu" });

    const [q] = applyHelpRequested([p], { ...event, status: "ditangani", handled_by: { id: 3, name: "Sinta" } });
    expect(q.help_request?.status).toBe("ditangani");
  });

  it("menghapus permintaan yang selesai", () => {
    const list = [presence(1, { help_request: { id: 5, note: null, status: "ditangani" } })];
    const [p] = applyHelpRequested(list, { ...event, status: "selesai" });
    expect(p.help_request).toBeNull();
  });
});

describe("format", () => {
  it("menghitung keadaan", () => {
    const count = countByState([presence(1), presence(2, { state: "istirahat" }), presence(3, { state: "keluar" }), presence(4)]);
    expect(count).toEqual({ di_kelas: 2, istirahat: 1, keluar: 1 });
  });

  it("menulis durasi", () => {
    expect(formatDuration(30)).toBe("< 1 mnt");
    expect(formatDuration(12 * 60 + 59)).toBe("12 mnt");
    expect(formatDuration(3600)).toBe("1 j");
    expect(formatDuration(2 * 3600 + 5 * 60)).toBe("2 j 5 mnt");
    expect(formatDuration(-10)).toBe("< 1 mnt");
  });

  it("menampilkan jam dalam WIB untuk waktu REST maupun event", () => {
    expect(formatClock("2026-11-09T02:15:20.000000Z")).toBe("09.15");
    expect(formatClock("2026-11-09T09:05:00+07:00")).toBe("09.05");
  });
});

describe("applyAnnouncements", () => {
  it("menggabungkan REST dan event tanpa dobel, terbaru dulu", () => {
    const a = (id: number, classroom: string) => ({ id, classroom });
    const awal = [a(5, "developer"), a(3, "developer")];
    // Pengumuman semua kelas (id 5) datang lagi dari kelas lain; yang pertama dipertahankan.
    expect(applyAnnouncements(awal, [a(5, "data-science"), a(7, "data-science"), a(4, "developer")])).toEqual([
      a(7, "data-science"),
      a(5, "developer"),
      a(4, "developer"),
      a(3, "developer"),
    ]);
  });
});

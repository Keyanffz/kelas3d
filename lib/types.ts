// Bentuk data dari kelas3d-api, mengikuti kelas3d-api/dokumentasi.md.
// Waktu dari REST berformat UTC, waktu dari event +07:00. Keduanya cukup dibaca dengan new Date().

export type UserRole = "koordinator" | "peserta";
export type MemberRole = "admin" | "anggota";
export type PresenceState = "di_kelas" | "istirahat" | "keluar";
export type StateReason = "idle" | "terputus" | "jadwal_istirahat";
export type Activity = "ngoding" | "vibe_coding" | "ngolah_data" | "browsing" | "main_game" | "lainnya";
export type HelpStatus = "menunggu" | "ditangani" | "selesai";

export interface Avatar {
  tipe_badan: "laki" | "perempuan";
  rambut: "rambut_1" | "rambut_2" | "rambut_3" | "rambut_4" | "rambut_5";
  warna: { kulit: string; rambut: string; celana: string };
}

export interface MyClassroom {
  id: number;
  name: string;
  slug: string;
  role: MemberRole;
  seat_code: string | null;
}

export interface Me {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar: Avatar | null;
  classrooms: MyClassroom[];
}

export interface Classroom {
  id: number;
  name: string;
  slug: string;
  network_cidr: string | null;
  public_ip: string | null;
}

export interface Presence {
  member_id: number;
  role: MemberRole;
  seat_code: string | null;
  user: { id: number; name: string; avatar: Avatar | null };
  state: PresenceState;
  state_reason: StateReason | null;
  activity: Activity | null;
  app_label: string | null;
  state_since: string | null;
  last_heartbeat_at: string | null;
  help_request: { id: number; note: string | null; status: HelpStatus } | null;
  // Field di bawah ini cuma dikirim untuk koordinator dan ketua kelas.
  project?: string | null;
  file_name?: string | null;
  language?: string | null;
  // Aplikasi lain yang jendelanya terbuka, terakhir dipakai dulu. Null kalau agent belum bisa membacanya.
  open_apps?: OpenApp[] | null;
}

export interface OpenApp {
  activity: Activity;
  label: string;
}

export interface Coordinator {
  id: number;
  name: string;
  avatar: Avatar | null;
}

export interface PresenceList {
  data: Presence[];
  coordinators: Coordinator[];
}

export interface PresenceChangedEvent {
  user_id: number;
  state: PresenceState;
  state_reason: StateReason | null;
  activity: Activity | null;
  app_label: string | null;
  state_since: string;
}

export interface HelpRequestedEvent {
  id: number;
  user: { id: number; name: string };
  note: string | null;
  status: HelpStatus;
  handled_by: { id: number; name: string } | null;
}

export interface ValidationErrorBody {
  message: string;
  errors?: Record<string, string[]>;
}

export type NudgeStatus = "terkirim" | "dibaca" | "selesai";
type Orang = { id: number; name: string };

export interface AnnouncementSentEvent {
  id: number;
  message: string;
  from: string;
  for_all: boolean;
  created_at: string;
}

export interface CoordinatorMovedEvent {
  coordinator: Coordinator;
  from: string | null;
  to: string | null;
}

export interface NudgeSentEvent {
  id: number;
  from: Orang;
  to: Orang;
  about: Orang;
  message: string;
  status: NudgeStatus;
}

export interface Nudge extends NudgeSentEvent {
  classroom: string;
  read_at: string | null;
  handled_at: string | null;
  created_at: string;
}

export interface Member {
  id: number;
  role: MemberRole;
  seat_code: string | null;
  user: { id: number; name: string; email: string; role: UserRole; avatar: Avatar | null };
}

export interface InstallCode {
  code: string;
  expires_at: string;
  commands: { windows: string; macos_linux: string };
}

export interface Device {
  id: number;
  hostname: string;
  os: "windows" | "macos" | "linux";
  agent_version: string;
  status: "pending" | "approved" | "revoked";
  approved_at: string | null;
  last_seen_at: string | null;
  user: Orang;
}

export interface Schedule {
  id: number;
  type: "kelas" | "istirahat";
  day_of_week: number;
  starts_at: string;
  ends_at: string;
}

export interface AppRule {
  id: number;
  match_on: "process" | "title";
  pattern: string;
  os: "windows" | "macos" | "linux" | null;
  activity: Activity;
  label: string;
  priority: number;
  is_active: boolean;
}

export interface ActivityRecap {
  from: string;
  to: string;
  per_day: { date: string; di_kelas: number; istirahat: number }[];
  per_project: { project: string; seconds: number }[];
  per_language: { language: string; seconds: number }[];
}

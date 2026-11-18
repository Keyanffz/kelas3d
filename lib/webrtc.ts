// Satu koneksi WebRTC antara dua browser. Tidak tahu soal Echo atau sesi: signaling dititipkan lewat `kirim`
// dan `terima`, jadi bisa dipakai ulang untuk share layar jenis lain.

export type Sinyal = { desc?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit };

export interface Peer {
  // Pihak yang membagikan memulai tawaran.
  tawar: () => Promise<void>;
  // Sinyal dari ujung satunya.
  terima: (s: Sinyal) => Promise<void>;
  tutup: () => void;
}

export function buatPeer(opsi: {
  ice: RTCIceServer[];
  kirim: (s: Sinyal) => void;
  // Diisi pihak yang membagikan.
  stream?: MediaStream;
  // Dipanggil di pihak yang menonton.
  onStream?: (stream: MediaStream) => void;
  onStatus?: (status: RTCPeerConnectionState) => void;
}): Peer {
  const pc = new RTCPeerConnection({ iceServers: opsi.ice });
  // Kandidat ICE bisa datang sebelum deskripsi ujung satunya terpasang.
  const antre: RTCIceCandidateInit[] = [];
  const { stream } = opsi;

  stream?.getTracks().forEach((t) => pc.addTrack(t, stream));
  pc.onicecandidate = (e) => e.candidate && opsi.kirim({ ice: e.candidate.toJSON() });
  pc.ontrack = (e) => opsi.onStream?.(e.streams[0]);
  pc.onconnectionstatechange = () => opsi.onStatus?.(pc.connectionState);

  const kirimDeskripsi = async () => {
    await pc.setLocalDescription();
    if (pc.localDescription) opsi.kirim({ desc: pc.localDescription.toJSON() });
  };

  return {
    tawar: kirimDeskripsi,
    async terima(s) {
      if (s.desc) {
        await pc.setRemoteDescription(s.desc);
        for (const c of antre.splice(0)) await pc.addIceCandidate(c);
        if (s.desc.type === "offer") await kirimDeskripsi();
      } else if (s.ice) {
        if (pc.remoteDescription) await pc.addIceCandidate(s.ice);
        else antre.push(s.ice);
      }
    },
    tutup: () => pc.close(),
  };
}

// Browser cuma menyediakan ini di https atau localhost.
export const bisaBagiLayar = () => typeof navigator.mediaDevices?.getDisplayMedia === "function";

// Harus dipanggil langsung dari klik pengguna; browser yang menampilkan pemilih layarnya.
export const ambilLayar = () => navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });

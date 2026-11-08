import Echo, { type ConnectionStatus } from "laravel-echo";
import Pusher from "pusher-js";
import { useSyncExternalStore } from "react";
import { api } from "./api";

let echo: Echo<"reverb"> | null = null;

// Satu koneksi Reverb untuk seluruh tab. Dibuat saat pertama dipakai, karena pusher-js butuh window.
export function getEcho(): Echo<"reverb"> {
  echo ??= new Echo({
    broadcaster: "reverb",
    Pusher,
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? "",
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    forceTLS: false,
    enabledTransports: ["ws"],
    // Otorisasi channel lewat sesi web: cookie dan X-XSRF-TOKEN, sama dengan request API lain.
    channelAuthorization: {
      customHandler: ({ socketId, channelName }, callback) => {
        api<{ auth: string; channel_data?: string }>("/api/broadcasting/auth", {
          method: "POST",
          body: { socket_id: socketId, channel_name: channelName },
        }).then(
          (data) => callback(null, data),
          (error: Error) => callback(error, null),
        );
      },
    },
  });
  return echo;
}

export function disconnectEcho() {
  echo?.disconnect();
  echo = null;
}

const subscribeStatus = (onChange: () => void) => getEcho().connector.onConnectionChange(onChange);
const readStatus = () => getEcho().connectionStatus();

export function useEchoStatus(): ConnectionStatus {
  return useSyncExternalStore(subscribeStatus, readStatus, () => "connecting");
}

import { useEffect } from "react";
import { io } from "socket.io-client";
import { API_URL, getAccessToken, refreshSession } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

// Socket.io runs on the API server's origin (e.g. http://localhost:5000).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? new URL(API_URL).origin;

interface Notification {
  id: string;
  type: "comment.created" | "post.created";
  message: string;
  link: string;
}

const PRESENTATION: Record<Notification["type"], { title: string; icon: string; linkLabel: string }> = {
  "comment.created": { title: "New comment on your post", icon: "💬", linkLabel: "View comment" },
  "post.created": { title: "New post published", icon: "📝", linkLabel: "Read post" },
};

/**
 * While a user is logged in, keeps a Socket.io connection open and shows incoming
 * notifications as toasts. Renders nothing.
 */
export function NotificationListener() {
  const { user } = useAuth();
  const toast = useToast();
  const userId = user?._id;

  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL, {
      // Called on every (re)connect, so a reconnect always uses the current access token.
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ["websocket"],
    });

    // The server rejects expired tokens. Refresh once and retry; if the refresh fails the
    // session is over and AuthProvider logs the user out (which closes this socket).
    let refreshedForThisAttempt = false;
    socket.on("connect", () => {
      refreshedForThisAttempt = false;
    });
    socket.on("connect_error", async (err) => {
      if (err.message !== "Unauthorized" || refreshedForThisAttempt) return;
      refreshedForThisAttempt = true;
      try {
        await refreshSession();
        socket.connect();
      } catch {
        /* session expired: handled by AuthProvider */
      }
    });

    socket.on("notification", (n: Notification) => {
      const p = PRESENTATION[n.type];
      toast.show({ title: p?.title ?? "Notification", message: n.message, icon: p?.icon, link: { to: n.link, label: p?.linkLabel ?? "Open" } });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, toast]);

  return null;
}

import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";
import type { ClientMessage, ErrorCode, PublicState, ServerMessage } from "@ambianceur/shared";
import type { StoredProfile } from "./profile";

export type RoomStatus = "connecting" | "open" | "reconnecting" | "gone" | "not_found" | "kicked" | "rejected";

export interface RoomError {
  code: ErrorCode;
  message: string;
  at: number;
}

const FINAL: RoomStatus[] = ["gone", "not_found", "kicked", "rejected"];

/** Connexion temps réel à une salle, avec reconnexion automatique (design D8). */
export function useRoom(code: string, profile: StoredProfile) {
  const [state, setState] = useState<PublicState | null>(null);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [error, setError] = useState<RoomError | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const socketRef = useRef<PartySocket | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    let final = false;
    const finish = (next: RoomStatus, err?: RoomError) => {
      final = true;
      setStatus(next);
      if (err) setError(err);
      socket.close();
    };
    const socket = new PartySocket({
      host: window.location.host,
      protocol: window.location.protocol === "https:" ? "wss" : "ws",
      party: "room",
      room: code,
      query: () => ({
        deviceId: profileRef.current.deviceId,
        pseudo: profileRef.current.pseudo,
        avatar: profileRef.current.avatar,
      }),
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => setStatus("open"));
    socket.addEventListener("close", () => {
      if (!final) setStatus("reconnecting");
    });
    socket.addEventListener("message", (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data) as ServerMessage;
      switch (message.type) {
        case "state":
          setState(message.state);
          setClockOffset(message.state.serverNow - Date.now());
          break;
        case "gone":
          finish(message.reason === "not_found" ? "not_found" : "gone");
          break;
        case "kicked":
          finish("kicked");
          break;
        case "error":
          if (message.code === "full" || message.code === "invalid_profile") {
            finish("rejected", { code: message.code, message: message.message, at: Date.now() });
          } else {
            setError({ code: message.code, message: message.message, at: Date.now() });
          }
          break;
      }
    });

    // Au retour au premier plan (iOS coupe les sockets en arrière-plan), on force la reconnexion.
    const onVisible = () => {
      if (document.visibilityState === "visible" && !final && socket.readyState !== WebSocket.OPEN) socket.reconnect();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      final = true;
      document.removeEventListener("visibilitychange", onVisible);
      socket.close();
      socketRef.current = null;
    };
  }, [code, profile.deviceId]);

  const send = useCallback((message: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(message));
  }, []);

  return { state, status, error, send, clockOffset, isFinal: FINAL.includes(status) };
}

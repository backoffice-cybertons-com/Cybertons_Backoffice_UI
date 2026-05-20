/**
 * useSignalRChat.js
 *
 * Production-ready React hook for SignalR real-time chat integration.
 *
 * Features:
 *  ✔ Starts the 'chat' hub ONCE on mount (singleton guard prevents duplicates).
 *  ✔ Registers ReceiveMessage listener with stable reference (no duplicate subs).
 *  ✔ Dispatches appendRealtimeMessage + updateChatLastMessage on every event.
 *  ✔ Deduplication is handled inside the reducer — hook stays clean.
 *  ✔ Auto-scrolls to latest message only for the active conversation.
 *  ✔ Tracks hub lifecycle: Connected / Reconnecting / Disconnected → Redux state.
 *  ✔ On unmount: removes only OUR listener, never stops the singleton hub.
 *
 * Extensibility stubs (commented):
 *   → UserTyping  (typing indicators)
 *   → UserOnline / UserOffline  (presence / online users)
 *   → ReceiveNotification  (cross-module notifications)
 */

import { useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import signalRService from "../../services/signalrService";
import {
  appendRealtimeMessage,
  updateChatLastMessage,
  setSignalRStatus,
} from "../../slices/chat/reducer";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const HUB_KEY = "chat";

/**
 * @param {object}   options
 * @param {number|string} [options.currentRoomId]  Active conversation/room ID.
 * @param {Function}      [options.scrollToBottom] Callback to scroll the message list.
 * @param {Function}      [options.getToken]       JWT factory. Defaults to localStorage.
 *
 * @returns {{ sendToHub: Function }}
 *   sendToHub(methodName, ...args) — invoke a server hub method.
 */
const useSignalRChat = ({
  currentRoomId,
  scrollToBottom,
  getToken = () => localStorage.getItem("authToken"),
} = {}) => {
  const dispatch = useDispatch();

  // ── Stable refs: keep latest values without causing effect re-runs ────────
  const getTokenRef    = useRef(getToken);
  const scrollRef      = useRef(scrollToBottom);
  const roomRef        = useRef(currentRoomId);

  useEffect(() => { getTokenRef.current = getToken;       }, [getToken]);
  useEffect(() => { scrollRef.current   = scrollToBottom; }, [scrollToBottom]);
  useEffect(() => { roomRef.current     = currentRoomId;  }, [currentRoomId]);

  // ── ReceiveMessage handler ────────────────────────────────────────────────
  // Created once (dispatch is stable). Same reference used for on() & off().
  const handleReceiveMessage = useCallback(
    (incomingMessage) => {
      // 1. Append to Redux state — reducer handles deduplication by id
      dispatch(appendRealtimeMessage(incomingMessage));

      // 2. Update sidebar chat list with latest message preview
      dispatch(updateChatLastMessage(incomingMessage));

      // 3. Auto-scroll only when the message belongs to the active room
      if (incomingMessage.roomId === roomRef.current) {
        // Small delay lets React flush the DOM before scrolling
        setTimeout(() => scrollRef.current?.(), 50);
      }
    },
    [dispatch] // dispatch is referentially stable — handler is created once
  );

  // ── Hub lifecycle + subscription setup ───────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    // 1. Register lifecycle callbacks BEFORE startHub so they're ready
    signalRService.setLifecycleCallbacks(HUB_KEY, {
      onConnected: () => {
        if (isMounted) dispatch(setSignalRStatus("Connected"));
      },
      onDisconnected: (err) => {
        if (!isMounted) return;
        if (err) console.warn("[Chat] Hub disconnected with error:", err.message);
        dispatch(setSignalRStatus("Disconnected"));
      },
      onReconnecting: (err) => {
        if (!isMounted) return;
        console.warn("[Chat] Hub reconnecting…", err?.message ?? "");
        dispatch(setSignalRStatus("Reconnecting"));
      },
      onReconnected: (connectionId) => {
        if (!isMounted) return;
        console.info("[Chat] Hub reconnected. ConnectionId:", connectionId);
        dispatch(setSignalRStatus("Connected"));
      },
    });

    // 2. Subscribe BEFORE startHub — service queues listeners for reconnections
    signalRService.on(HUB_KEY, "ReceiveMessage", handleReceiveMessage);

    // ── Extensibility stubs ───────────────────────────────────────────────
    // signalRService.on(HUB_KEY, "UserTyping",         handleUserTyping);
    // signalRService.on(HUB_KEY, "UserOnline",          handleUserOnline);
    // signalRService.on(HUB_KEY, "UserOffline",         handleUserOffline);
    // signalRService.on(HUB_KEY, "ReceiveNotification", handleNotification);

    // 3. Start hub — singleton guard prevents duplicate connections
    signalRService
      .startHub(HUB_KEY, () => getTokenRef.current?.())
      .then(() => {
        if (isMounted) dispatch(setSignalRStatus("Connected"));
      })
      .catch((err) => {
        console.error("[Chat] SignalR hub failed to start:", err);
        if (isMounted) dispatch(setSignalRStatus("Disconnected"));
      });

    // ── Cleanup on unmount ────────────────────────────────────────────────
    return () => {
      isMounted = false;

      // Remove only OUR listener — do NOT stop the hub.
      // The singleton hub may be reused by notification badges or other components.
      signalRService.off(HUB_KEY, "ReceiveMessage", handleReceiveMessage);

      // ── Remove extensibility stubs on cleanup ─────────────────────────
      // signalRService.off(HUB_KEY, "UserTyping",         handleUserTyping);
      // signalRService.off(HUB_KEY, "UserOnline",          handleUserOnline);
      // signalRService.off(HUB_KEY, "UserOffline",         handleUserOffline);
      // signalRService.off(HUB_KEY, "ReceiveNotification", handleNotification);
    };
  }, [handleReceiveMessage, dispatch]);
  // ↑ handleReceiveMessage is created once (dispatch is stable), so this
  //   effect runs exactly once on mount and cleans up once on unmount.

  // ── Public API ────────────────────────────────────────────────────────────
  /**
   * Invoke a server-side hub method via SignalR.
   * @example await sendToHub("SendMessage", { roomId, text, sender });
   */
  const sendToHub = useCallback(async (methodName, ...args) => {
    return signalRService.invoke(HUB_KEY, methodName, ...args);
  }, []);

  return { sendToHub };
};

export default useSignalRChat;

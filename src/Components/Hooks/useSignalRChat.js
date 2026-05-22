import { useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import signalRService from "../../services/signalrService";
import {
  appendRealtimeMessage,
  updateChatLastMessage,
  setSignalRStatus,
  removeMessage,
} from "../../slices/chat/reducer";

const HUB_KEY = "chat";

const sameId = (left, right) =>
  left !== undefined &&
  left !== null &&
  right !== undefined &&
  right !== null &&
  left.toString() === right.toString();

const useSignalRChat = ({
  currentRoomId,
  currentUserId,
  activeChatUserId,
  scrollToBottom,
  onMessageReceived,
  getToken = () => localStorage.getItem("authToken"),
} = {}) => {
  const dispatch = useDispatch();

  const getTokenRef = useRef(getToken);
  const scrollRef = useRef(scrollToBottom);
  const roomRef = useRef(currentRoomId);
  const currentUserRef = useRef(currentUserId);
  const activeUserRef = useRef(activeChatUserId);
  const onMessageRef = useRef(onMessageReceived);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    scrollRef.current = scrollToBottom;
  }, [scrollToBottom]);

  useEffect(() => {
    roomRef.current = currentRoomId;
  }, [currentRoomId]);

  useEffect(() => {
    currentUserRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    activeUserRef.current = activeChatUserId;
  }, [activeChatUserId]);

  useEffect(() => {
    onMessageRef.current = onMessageReceived;
  }, [onMessageReceived]);

  const handleReceiveMessage = useCallback(
    (incomingMessage) => {
      const senderId = incomingMessage?.senderUserId ?? incomingMessage?.senderId;
      const receiverId =
        incomingMessage?.receiverUserId ?? incomingMessage?.receiverId;
      const currentUserIdValue = currentUserRef.current;
      const activeChatUserIdValue = activeUserRef.current;

      const belongsToActiveChat =
        (sameId(senderId, activeChatUserIdValue) &&
          sameId(receiverId, currentUserIdValue)) ||
        (sameId(senderId, currentUserIdValue) &&
          sameId(receiverId, activeChatUserIdValue));

      if (belongsToActiveChat) {
        dispatch(appendRealtimeMessage(incomingMessage));
      }

      dispatch(updateChatLastMessage(incomingMessage));

      if (belongsToActiveChat || incomingMessage?.roomId === roomRef.current) {
        setTimeout(() => scrollRef.current?.(), 50);
      }

      onMessageRef.current?.(incomingMessage, {
        isActiveChat: Boolean(belongsToActiveChat),
        isIncomingForCurrentUser:
          sameId(receiverId, currentUserIdValue) &&
          !sameId(senderId, currentUserIdValue),
      });
    },
    [dispatch],
  );

  const handleMessageDeleted = useCallback(
    (payload) => {
      const messageId = payload?.messageId ?? payload;
      dispatch(removeMessage(messageId));
    },
    [dispatch],
  );

  useEffect(() => {
    let isMounted = true;

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
        console.warn("[Chat] Hub reconnecting...", err?.message ?? "");
        dispatch(setSignalRStatus("Reconnecting"));
      },
      onReconnected: (connectionId) => {
        if (!isMounted) return;
        console.info("[Chat] Hub reconnected. ConnectionId:", connectionId);
        dispatch(setSignalRStatus("Connected"));
      },
    });

    signalRService.on(HUB_KEY, "ReceiveMessage", handleReceiveMessage);
    signalRService.on(HUB_KEY, "MessageDeleted", handleMessageDeleted);

    signalRService
      .startHub(HUB_KEY, () => getTokenRef.current?.())
      .then(() => {
        if (isMounted) dispatch(setSignalRStatus("Connected"));
      })
      .catch((err) => {
        console.error("[Chat] SignalR hub failed to start:", err);
        if (isMounted) dispatch(setSignalRStatus("Disconnected"));
      });

    return () => {
      isMounted = false;
      signalRService.off(HUB_KEY, "ReceiveMessage", handleReceiveMessage);
      signalRService.off(HUB_KEY, "MessageDeleted", handleMessageDeleted);
    };
  }, [handleReceiveMessage, handleMessageDeleted, dispatch]);

  const sendToHub = useCallback(async (methodName, ...args) => {
    return signalRService.invoke(HUB_KEY, methodName, ...args);
  }, []);

  return { sendToHub };
};

export default useSignalRChat;

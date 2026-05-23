import { createSlice } from "@reduxjs/toolkit";
import { getDirectContact, getChannels, getMessages, addMessage, deleteMessage } from "./thunk";

export const initialState = {
  chats: [],
  messages: [],
  channels: [],
  error: {},
  /**
   * Tracks the SignalR hub connection state.
   * Values: 'Connected' | 'Reconnecting' | 'Disconnected'
   * Set by useSignalRChat hook via setSignalRStatus action.
   */
  signalRStatus: "Disconnected",
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    /**
     * Append a real-time message received from SignalR.
     *
     * Deduplication strategy:
     *   - If the incoming message has an `id` field, check whether a message
     *     with that id already exists before pushing. This prevents double-
     *     rendering when the sender's own message arrives back via the hub
     *     at the same time as the optimistic local addMessage dispatch.
     *   - Messages without an `id` are always appended (edge-case safety).
     */
    appendRealtimeMessage(state, action) {
      const incoming = action.payload;
      const list = Array.isArray(state.messages) ? state.messages : [];

      const incomingId =
        incoming.messageId ??
        incoming.MessageId ??
        incoming.id ??
        incoming.message_id;
      // Dedup: skip if a message with the same id already exists
      if (incomingId !== undefined) {
        const alreadyExists = list.some((m) => {
          const existingId =
            m.messageId ?? m.MessageId ?? m.id ?? m.message_id;
          return existingId?.toString() === incomingId?.toString();
        });
        if (alreadyExists) return;
      }

      state.messages = [...list, incoming];
    },

    /**
     * Update the sidebar chat list entry with the latest message preview.
     * Called whenever a real-time ReceiveMessage event fires.
     *
     * Matches on `roomId`. If no matching chat is found, does nothing —
     * it may be a message for a conversation not yet loaded in the sidebar.
     */
    updateChatLastMessage(state, action) {
      const payload = action.payload || {};
      const roomId = payload.roomId;
      const message =
        payload.message ||
        payload.messageText ||
        payload.text ||
        payload.content ||
        "";
      const createdAt = payload.createdAt || payload.createdDate;
      const senderId = payload.senderUserId ?? payload.senderId;
      const receiverId = payload.receiverUserId ?? payload.receiverId;
      const chat = (state.chats || []).find((c) => {
        if (roomId && c.roomId === roomId) return true;
        const chatUserId = c.userId ?? c.UserId ?? c.id;
        return (
          chatUserId?.toString() === senderId?.toString() ||
          chatUserId?.toString() === receiverId?.toString()
        );
      });
      if (chat) {
        chat.lastMessage = message;
        chat.lastMessageDate = createdAt;
        chat.lastMessageTime = createdAt;
      }
    },

    /**
     * Set the SignalR hub connection status string.
     * Consumed by the Chat UI to show a live connection indicator.
     *
     * @param {string} action.payload — 'Connected' | 'Reconnecting' | 'Disconnected'
     */
    setSignalRStatus(state, action) {
      state.signalRStatus = action.payload;
    },

    setMessagesData(state, action) {
      state.messages = action.payload;
    },

    /**
     * Mark outgoing messages as read (read receipt from recipient).
     * Updates messages where sender = senderUserId and receiver = receiverUserId.
     */
    markMessagesAsRead(state, action) {
      const { senderUserId, receiverUserId, readAt } = action.payload || {};
      if (!senderUserId || !receiverUserId) return;

      const readTimestamp = readAt || new Date().toISOString();

      state.messages = (state.messages || []).map((message) => {
        const senderId = message.senderUserId ?? message.senderId;
        const receiverId = message.receiverUserId ?? message.receiverId;
        const alreadyRead = message.readAt ?? message.read_at;
        const isMatch =
          senderId?.toString() === senderUserId?.toString() &&
          receiverId?.toString() === receiverUserId?.toString() &&
          !alreadyRead;

        if (isMatch) {
          return { ...message, readAt: readTimestamp, read_at: readTimestamp };
        }
        return message;
      });
    },

    removeMessage(state, action) {
      const deletedId = action.payload;
      state.messages = (state.messages || []).filter((message) => {
        const msgId =
          message.messageId ??
          message.MessageId ??
          message.id ??
          message.message_id;
        return msgId?.toString() !== deletedId?.toString();
      });
    }
  },

  extraReducers: (builder) => {
    builder.addCase(getDirectContact.fulfilled, (state, action) => {
      state.chats = action.payload;
    });
    builder.addCase(getDirectContact.rejected, (state, action) => {
      state.error = action.payload?.error || null;
    });

    builder.addCase(getChannels.fulfilled, (state, action) => {
      state.channels = action.payload;
    });
    builder.addCase(getChannels.rejected, (state, action) => {
      state.error = action.payload?.error || null;
    });

    builder.addCase(getMessages.fulfilled, (state, action) => {
      state.messages = action.payload;
    });
    builder.addCase(getMessages.rejected, (state, action) => {
      state.error = action.payload?.error || null;
    });

    builder.addCase(addMessage.fulfilled, (state, action) => {
      if (Array.isArray(state.messages)) {
        state.messages.unshift(action.payload);
      }
    });
    builder.addCase(addMessage.rejected, (state, action) => {
      state.error = action.payload?.error || null;
    });

    builder.addCase(deleteMessage.fulfilled, (state, action) => {
      const deletedId = action.payload;
      state.messages = (state.messages || []).filter((message) => {
        const msgId =
          message.messageId ??
          message.MessageId ??
          message.id ??
          message.message_id;
        return msgId?.toString() !== deletedId?.toString();
      });
    });
    builder.addCase(deleteMessage.rejected, (state, action) => {
      state.error = action.payload?.error || null;
    });
  },
});

export const {
  appendRealtimeMessage,
  updateChatLastMessage,
  setSignalRStatus,
  setMessagesData,
  markMessagesAsRead,
  removeMessage,
} = chatSlice.actions;

export default chatSlice.reducer;

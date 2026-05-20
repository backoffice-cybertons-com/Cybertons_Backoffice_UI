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

      // Dedup: skip if a message with the same id already exists
      if (incoming.id !== undefined) {
        const alreadyExists = list.some((m) => m.id === incoming.id);
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
      const { roomId, message, sender, createdAt } = action.payload;
      const chat = (state.chats || []).find((c) => c.roomId === roomId);
      if (chat) {
        chat.lastMessage = message;
        chat.lastMessageTime = createdAt;
        // Optional: increment unread badge when not the active room
        // (the component can clear it when the user opens the conversation)
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
      state.messages = (state.messages || []).filter(
        (message) => message.id.toString() !== action.payload.toString()
      );
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
} = chatSlice.actions;

export default chatSlice.reducer;

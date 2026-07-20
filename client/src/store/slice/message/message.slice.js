import { createSlice } from "@reduxjs/toolkit";
import { getMessageThunk, sendMessageThunk, getConversationsThunk } from "./message.thunk";

export const messageSlice = createSlice({
  name: "message",
  initialState: {
    buttonLoading: false,
    screenLoading: false,
    messages: [],
    typingUsers: {},
    unreadCounts: {},
    conversations: [],
  },
  reducers: {
    setNewMessage: (state, action) => {
      const { message, selectedUserId } = action.payload;
      if (selectedUserId && String(message.senderId) === String(selectedUserId)) {
        state.messages = [...state.messages, message];
      } else {
        state.unreadCounts[message.senderId] = (state.unreadCounts[message.senderId] || 0) + 1;
      }
    },
    setMessagesSeen: (state, action) => {
      const { messageIds, userId } = action.payload;
      state.messages = state.messages.map(msg => {
        if (messageIds.includes(msg._id)) {
          const existing = msg.seenBy || [];
          if (!existing.find(s => String(s.userId) === String(userId))) {
            return { ...msg, seenBy: [...existing, { userId, seenAt: new Date().toISOString() }] };
          }
          return msg;
        }
        return msg;
      });
    },
    editMessageInStore: (state, action) => {
      const updatedMessage = action.payload;
      const index = state.messages.findIndex(m => m._id === updatedMessage._id);
      if (index !== -1) {
        state.messages[index] = updatedMessage;
      }
    },
    deleteMessageFromStore: (state, action) => {
      const { messageId, deleteForEveryone } = action.payload;
      state.messages = state.messages.map(msg => {
        if (msg._id === messageId) {
          if (deleteForEveryone) {
            return { ...msg, isDeletedForEveryone: true };
          }
          return { ...msg, isDeletedForSender: true };
        }
        return msg;
      });
    },
    updateMessageReactions: (state, action) => {
      const { messageId, reactions } = action.payload;
      const index = state.messages.findIndex(m => m._id === messageId);
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], reactions };
      }
    },
    setTypingUsers: (state, action) => {
      const { userId, isTyping, name } = action.payload;
      if (isTyping) {
        state.typingUsers[userId] = { isTyping: true, name: name || "Someone" };
      } else {
        delete state.typingUsers[userId];
      }
    },
    resetUnreadCount: (state, action) => {
      const userId = action.payload;
      state.unreadCounts[userId] = 0;
    },
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    updateConversationLastMessage: (state, action) => {
      const { conversationId, lastMessage } = action.payload;
      const index = state.conversations.findIndex(c => String(c.conversationId) === String(conversationId));
      if (index !== -1) {
        state.conversations[index] = { ...state.conversations[index], lastMessage };
      }
    },
    setInitialUnreadCounts: (state, action) => {
      state.unreadCounts = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sendMessageThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(sendMessageThunk.fulfilled, (state, action) => {
      state.messages = [...state.messages, action.payload?.responseData];
      state.buttonLoading = false;
    });
    builder.addCase(sendMessageThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(getMessageThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(getMessageThunk.fulfilled, (state, action) => {
      state.messages = action.payload?.responseData?.messages || [];
      state.buttonLoading = false;
    });
    builder.addCase(getMessageThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(getConversationsThunk.fulfilled, (state, action) => {
      const data = action.payload?.responseData || [];
      state.conversations = data;
      const unreadMap = {};
      data.forEach(c => {
        if (c.otherUser?._id) {
          unreadMap[c.otherUser._id] = c.unreadCount ?? 0;
        }
      });
      state.unreadCounts = { ...state.unreadCounts, ...unreadMap };
    });
  },
});

export const {
  setNewMessage,
  setMessagesSeen,
  editMessageInStore,
  deleteMessageFromStore,
  updateMessageReactions,
  setTypingUsers,
  resetUnreadCount,
  setConversations,
  updateConversationLastMessage,
  setInitialUnreadCounts,
  clearMessages,
} = messageSlice.actions;

export default messageSlice.reducer;

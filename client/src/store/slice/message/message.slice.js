import { createSlice } from "@reduxjs/toolkit";
import { getMessageThunk, sendMessageThunk, getConversationsThunk, loadOlderMessagesThunk } from "./message.thunk";

export const toCallView = (log) => ({
  _id: `call-${String(log?._id)}`,
  type: 'call',
  callStatus: log?.status,
  callDuration: log?.durationSec,
  callerId: log?.callerId,
  receiverId: log?.receiverId,
  createdAt: log?.endedAt || log?.createdAt,
});

export const mergeCallLogs = (messages, calls) => {
  if (!calls?.length) return messages;
  const callViews = calls.map(toCallView);
  return [...messages, ...callViews].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
};

const conversationPreview = (message) => ({
  message: message?.messageType === 'image' ? '[Image]' : (message?.message || ''),
  senderId: message?.senderId,
  createdAt: message?.createdAt,
});

const updateConversationInPlace = (state, peerId, lastMessage) => {
  const index = state.conversations.findIndex(
    c => String(c.otherUser?._id) === String(peerId)
  );
  if (index === -1) {
    state.conversationsStale = true;
    return;
  }
  state.conversations[index] = {
    ...state.conversations[index],
    lastMessage,
    updatedAt: lastMessage?.createdAt || state.conversations[index].updatedAt,
  };
  state.conversations = [...state.conversations].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );
};

export const messageSlice = createSlice({
  name: "message",
  initialState: {
    buttonLoading: false,
    screenLoading: false,
    messages: [],
    typingUsers: {},
    unreadCounts: {},
    conversations: [],
    conversationsStale: false,
    hasMore: false,
    nextCursor: null,
    loadingOlder: false,
    activeChatPeerId: null,
  },
  reducers: {
    setNewMessage: (state, action) => {
      const { message, selectedUserId } = action.payload;
      updateConversationInPlace(state, message?.senderId, conversationPreview(message));
      if (selectedUserId && String(message.senderId) === String(selectedUserId)) {
        if (message?._id && !state.messages.some(m => String(m._id) === String(message._id))) {
          state.messages = [...state.messages, message];
        }
      } else {
        state.unreadCounts[message.senderId] = (state.unreadCounts[message.senderId] || 0) + 1;
      }
    },
    addCallLog: (state, action) => {
      const { log, peerId } = action.payload;
      if (!log?._id || !peerId) return;
      const callView = toCallView(log);
      if (state.messages.some(m => m._id === callView._id)) return;
      state.messages = [...state.messages, callView].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
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
  },
  extraReducers: (builder) => {
    builder.addCase(sendMessageThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(sendMessageThunk.fulfilled, (state, action) => {
      state.buttonLoading = false;
      const msg = action.payload?.responseData;
      if (msg?._id && !state.messages.some(m => String(m._id) === String(msg._id))) {
        state.messages = [...state.messages, msg];
      }
      if (msg?.recieverId) {
        updateConversationInPlace(state, msg.recieverId, conversationPreview(msg));
      }
    });
    builder.addCase(sendMessageThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(getMessageThunk.pending, (state, action) => {
      state.buttonLoading = true;
      state.loadingOlder = false;
      state.activeChatPeerId = action.meta.arg.recieverId;
    });
    builder.addCase(getMessageThunk.fulfilled, (state, action) => {
      if (String(action.meta.arg.recieverId) !== String(state.activeChatPeerId)) {
        state.buttonLoading = false;
        return;
      }
      const data = action.payload?.responseData;
      state.messages = mergeCallLogs(data?.messages || [], data?.calls || []);
      state.hasMore = Boolean(data?.hasMore);
      state.nextCursor = data?.nextCursor || null;
      state.buttonLoading = false;
    });
    builder.addCase(getMessageThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(loadOlderMessagesThunk.pending, (state) => {
      state.loadingOlder = true;
    });
    builder.addCase(loadOlderMessagesThunk.fulfilled, (state, action) => {
      state.loadingOlder = false;
      if (String(action.meta.arg.recieverId) !== String(state.activeChatPeerId)) {
        return;
      }
      const data = action.payload?.responseData;
      const older = data?.messages || [];
      const existingIds = new Set(state.messages.map(m => String(m._id)));
      const freshOlder = older.filter(m => !existingIds.has(String(m._id)));
      state.messages = [...freshOlder, ...state.messages];
      state.hasMore = Boolean(data?.hasMore);
      state.nextCursor = data?.nextCursor || null;
    });
    builder.addCase(loadOlderMessagesThunk.rejected, (state) => {
      state.loadingOlder = false;
    });

    builder.addCase(getConversationsThunk.fulfilled, (state, action) => {
      const data = action.payload?.responseData || [];
      state.conversations = data;
      state.conversationsStale = false;
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
  addCallLog,
  setMessagesSeen,
  editMessageInStore,
  deleteMessageFromStore,
  updateMessageReactions,
  setTypingUsers,
  resetUnreadCount,
} = messageSlice.actions;

export default messageSlice.reducer;

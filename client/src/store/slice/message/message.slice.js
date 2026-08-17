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

export const mergeMessagesDeduped = (base, additions) => {
  const seen = new Set();
  const merged = [...base, ...additions].filter((m) => {
    if (!m?._id) return true;
    const key = String(m._id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return merged.sort(
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
      const { message, selectedUserId, currentUserId } = action.payload;
      if (!message?._id) return;
      const senderId = String(message.senderId || "");
      const receiverId = String(message.recieverId || "");
      const isOwn = Boolean(currentUserId) && senderId === String(currentUserId);
      const belongsToOpenChat = Boolean(selectedUserId) &&
        (senderId === String(selectedUserId) || receiverId === String(selectedUserId));

      updateConversationInPlace(
        state,
        isOwn ? message.recieverId : message.senderId,
        conversationPreview(message)
      );

      if (belongsToOpenChat) {
        if (!state.messages.some(m => String(m._id) === String(message._id))) {
          state.messages = mergeMessagesDeduped(state.messages, [message]);
        }
      } else if (!isOwn) {
        const peerId = message.senderId;
        state.unreadCounts[peerId] = (state.unreadCounts[peerId] || 0) + 1;
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
      if (String(action.meta.arg.recieverId) !== String(state.activeChatPeerId)) {
        state.messages = [];
        state.hasMore = false;
        state.nextCursor = null;
      }
      state.activeChatPeerId = action.meta.arg.recieverId;
    });
    builder.addCase(getMessageThunk.fulfilled, (state, action) => {
      if (String(action.meta.arg.recieverId) !== String(state.activeChatPeerId)) {
        state.buttonLoading = false;
        return;
      }
      const data = action.payload?.responseData;
      const loaded = mergeCallLogs(data?.messages || [], data?.calls || []);
      // Merge with any messages that arrived via Socket.IO while the fetch was
      // in flight. The API snapshot can predate a live message; without this
      // merge the live message would vanish until the user refreshes.
      state.messages = mergeMessagesDeduped(loaded, state.messages);
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
      // Keep the higher count: a Socket.IO message may have arrived after the
      // server computed this snapshot; never let a stale snapshot drop a fresh
      // unread badge (it self-corrects on the next fetch).
      state.unreadCounts = { ...unreadMap, ...state.unreadCounts };
      Object.entries(unreadMap).forEach(([peerId, count]) => {
        state.unreadCounts[peerId] = Math.max(
          Number(state.unreadCounts[peerId] || 0),
          Number(count || 0)
        );
      });
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

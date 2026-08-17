import dotenv from "dotenv";
dotenv.config();

import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Conversation from "../models/conversation.model.js";
import CallLog from "../models/call.model.js";

const app = express();
const server = http.createServer(app);

// Single source of truth for allowed CORS origins.
// Socket.IO and Express CORS both use this list.
const defaultOrigins = [
  "http://localhost:5173",
  "https://chat-verse-kappa.vercel.app",
];
const envOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// --- USER -> SOCKET(S) MAPPING ---
// Each user can be connected from multiple tabs/devices.
// userSockets: Map<userId, Set<socketId>>
const userSockets = new Map();

const getSocketIds = (userId) => {
  if (!userId) return [];
  return [...(userSockets.get(String(userId)) || [])];
};

// Emit to EVERY socket connected for a user (all tabs/devices).
export const emitToUser = (userId, event, data) => {
  if (!userId) return;
  for (const socketId of getSocketIds(userId)) {
    io.to(socketId).emit(event, data);
  }
};

// Backward-compatible helper: first socket id for a user (or undefined).
export const getSocketId = (userId) => getSocketIds(userId)[0];

// --- CALL STATE (signaling only; audio flows peer-to-peer via WebRTC) ---
const activeCalls = new Map(); // callerId -> { callerId, calleeId, ringAt, answerAt }
const busyUsers = new Set();

const findCall = (userId) => {
  for (const call of activeCalls.values()) {
    if (call.callerId === userId || call.calleeId === userId) return call;
  }
  return null;
};

const unregisterCall = (callerId) => {
  const call = activeCalls.get(callerId);
  if (call) {
    busyUsers.delete(call.callerId);
    busyUsers.delete(call.calleeId);
    activeCalls.delete(callerId);
  }
};

const saveCallLog = async (call, status) => {
  try {
    const endedAt = new Date();
    const answerAt = call.answerAt ? new Date(call.answerAt) : null;
    const durationSec = answerAt
      ? Math.max(1, Math.round((endedAt - answerAt) / 1000))
      : 0;
    const log = await CallLog.create({
      callerId: call.callerId,
      receiverId: call.calleeId,
      status,
      startedAt: call.ringAt,
      answerAt: answerAt || undefined,
      endedAt,
      durationSec,
    });

    const callPreview = status === "completed" ? "📞 Audio call" : "📞 Missed call";
    await Conversation.findOneAndUpdate(
      { participants: { $all: [call.callerId, call.calleeId] } },
      { lastMessage: { message: callPreview, senderId: call.callerId, createdAt: endedAt } }
    );

    return log;
  } catch (err) {
    console.error("Error saving call log:", err);
    return null;
  }
};

const emitCallHistory = (log, callerId, calleeId) => {
  if (!log) return;
  emitToUser(callerId, "callHistory", { log, peerId: calleeId });
  emitToUser(calleeId, "callHistory", { log, peerId: callerId });
};

io.on("connection", (socket) => {

  const userID = socket.handshake.query.userId;

  if (userID) {
    if (!userSockets.has(String(userID))) {
      userSockets.set(String(userID), new Set());
    }
    userSockets.get(String(userID)).add(socket.id);
  }

  io.emit("onlineUsers", [...userSockets.keys()]);

  // --- TYPING ---
  socket.on("typing", ({ recieverId, senderName }) => {
    emitToUser(recieverId, "typing", { senderId: userID, senderName });
  });

  socket.on("stopTyping", ({ recieverId }) => {
    emitToUser(recieverId, "stopTyping", { senderId: userID });
  });

  // --- MESSAGE SEEN ---
  socket.on("messageSeen", async ({ messageIds, senderId }) => {
    try {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $addToSet: { seenBy: { userId: userID, seenAt: new Date() } } }
      );

      emitToUser(senderId, "messageSeen", { messageIds, userId: userID });
    } catch (err) {
      console.error("Error marking messages as seen:", err);
    }
  });

  // --- MESSAGE EDITED ---
  socket.on("messageEdited", async ({ messageId, newMessage, recieverId }) => {
    try {
      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        { message: newMessage, isEdited: true, editedAt: new Date() },
        { new: true }
      );

      emitToUser(recieverId, "messageEdited", updatedMessage);
      emitToUser(userID, "messageEdited", updatedMessage);
    } catch (err) {
      console.error("Error editing message:", err);
    }
  });

  // --- MESSAGE DELETED ---
  socket.on("messageDeleted", async ({ messageId, recieverId, deleteForEveryone }) => {
    try {
      const update = deleteForEveryone
        ? { isDeletedForEveryone: true, deletedAt: new Date() }
        : { isDeletedForSender: true, deletedAt: new Date() };

      await Message.findByIdAndUpdate(messageId, update);

      const data = { messageId, deleteForEveryone, deletedBy: userID };
      emitToUser(recieverId, "messageDeleted", data);
      emitToUser(userID, "messageDeleted", data);
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  });

  // --- MESSAGE REACTED ---
  socket.on("messageReacted", async ({ messageId, emoji, recieverId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const existingReactionIndex = message.reactions.findIndex(
        (r) => r.userId.toString() === userID && r.emoji === emoji
      );

      if (existingReactionIndex > -1) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        const existingUserReaction = message.reactions.find(
          (r) => r.userId.toString() === userID
        );
        if (existingUserReaction) {
          existingUserReaction.emoji = emoji;
          existingUserReaction.createdAt = new Date();
        } else {
          message.reactions.push({ emoji, userId: userID, createdAt: new Date() });
        }
      }

      await message.save();

      const data = { messageId, reactions: message.reactions };
      emitToUser(recieverId, "messageReacted", data);
      emitToUser(userID, "messageReacted", data);
    } catch (err) {
      console.error("Error reacting to message:", err);
    }
  });

  // --- CALL SIGNALING (WebRTC offer/answer/ICE relay only) ---
  socket.on("call:start", async ({ to, offer, fromName, fromAvatar }) => {
    if (!to || !offer) return;
    if (busyUsers.has(userID)) {
      socket.emit("call:failed", { reason: "busy" });
      return;
    }
    const targetSocketId = getSocketId(to);
    if (!targetSocketId) {
      socket.emit("call:failed", { reason: "offline" });
      return;
    }
    if (busyUsers.has(to)) {
      socket.emit("call:failed", { reason: "busy" });
      return;
    }

    try {
      const [callerUser, calleeUser] = await Promise.all([
        User.findById(userID).select("blockedUsers"),
        User.findById(to).select("blockedUsers")
      ]);
      const callerBlocked = callerUser?.blockedUsers?.some(id => String(id) === String(to));
      const calleeBlocked = calleeUser?.blockedUsers?.some(id => String(id) === String(userID));
      if (callerBlocked || calleeBlocked) {
        socket.emit("call:failed", { reason: "unavailable" });
        return;
      }
    } catch (err) {
      console.error("Error checking block status for call:", err);
    }

    busyUsers.add(userID);
    busyUsers.add(to);
    activeCalls.set(userID, { callerId: userID, calleeId: to, ringAt: new Date() });
    io.to(targetSocketId).emit("call:incoming", { from: userID, fromName, fromAvatar, offer });
  });

  socket.on("call:accept", ({ to, answer }) => {
    if (!to || !answer) return;
    const call = activeCalls.get(to);
    if (call && !call.answerAt) {
      call.answerAt = new Date();
    }
    const callerSocketId = getSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call:answer", { from: userID, answer });
    }
  });

  socket.on("call:reject", async ({ to, reason }) => {
    const call = findCall(userID);
    if (call) {
      const status =
        reason === "timeout" ? "missed"
        : reason === "busy" ? "busy"
        : reason === "mic" ? "failed"
        : "rejected";
      const log = await saveCallLog(call, status);
      unregisterCall(call.callerId);
      emitCallHistory(log, call.callerId, call.calleeId);
    }
    const callerSocketId = getSocketId(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call:rejected", { from: userID, reason: reason || "rejected" });
    }
  });

  socket.on("call:cancel", async ({ to }) => {
    const call = findCall(userID);
    if (call) {
      const log = await saveCallLog(call, "cancelled");
      unregisterCall(call.callerId);
      emitCallHistory(log, call.callerId, call.calleeId);
    }
    const targetSocketId = getSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:cancelled", { from: userID });
    }
  });

  socket.on("call:end", async ({ to }) => {
    const call = findCall(userID);
    const other = call ? (call.callerId === userID ? call.calleeId : call.callerId) : to;
    if (call) {
      const log = await saveCallLog(call, "completed");
      unregisterCall(call.callerId);
      emitCallHistory(log, call.callerId, call.calleeId);
    }
    const otherSocketId = getSocketId(other);
    if (otherSocketId) {
      io.to(otherSocketId).emit("call:ended", { from: userID });
    }
  });

  socket.on("call:ice", ({ to, candidate }) => {
    if (!to || !candidate) return;
    const targetSocketId = getSocketId(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:ice", { from: userID, candidate });
    }
  });

  // --- DISCONNECT ---
  socket.on("disconnect", async () => {
    const activeCall = findCall(userID);
    if (activeCall) {
      const other = activeCall.callerId === userID ? activeCall.calleeId : activeCall.callerId;
      const status = activeCall.answerAt
        ? "completed"
        : activeCall.callerId === userID
          ? "cancelled"
          : "missed";
      const log = await saveCallLog(activeCall, status);
      unregisterCall(activeCall.callerId);
      emitCallHistory(log, activeCall.callerId, activeCall.calleeId);
      const otherSocketId = getSocketId(other);
      if (otherSocketId) {
        io.to(otherSocketId).emit("call:ended", { from: userID });
      }
    }
    busyUsers.delete(userID);

    // Remove ONLY this socket from the user's socket set.
    // Other tabs/devices keep their mapping intact.
    if (userID && userSockets.has(String(userID))) {
      const sockets = userSockets.get(String(userID));
      sockets.delete(socket.id);

      // Last socket for this user disconnected -> user is now offline.
      if (sockets.size === 0) {
        userSockets.delete(String(userID));

        try {
          await User.findByIdAndUpdate(userID, { lastSeen: new Date() });

          const user = await User.findById(userID).select("lastSeen");
          io.emit("userLastSeen", { userId: userID, lastSeen: user?.lastSeen });
        } catch (err) {
          console.error("Error updating lastSeen:", err);
        }
      }
    }

    io.emit("onlineUsers", [...userSockets.keys()]);
  });
});

export { io, server, app };

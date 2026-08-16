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

const io = new Server(server, {
  cors: {
    origin: (process.env.CLIENT_URL || "").split(",").map((origin) => origin.trim()),
    credentials: true,
  },
});

const userSocketMap = {};

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
  const callerSocketId = getSocketId(callerId);
  if (callerSocketId) {
    io.to(callerSocketId).emit("callHistory", { log, peerId: calleeId });
  }
  const calleeSocketId = getSocketId(calleeId);
  if (calleeSocketId) {
    io.to(calleeSocketId).emit("callHistory", { log, peerId: callerId });
  }
};

export const getSocketId = (userId) => {
  return userSocketMap[userId];
};

io.on("connection", (socket) => {

  const userID = socket.handshake.query.userId;

  if (userID) {
    userSocketMap[userID] = socket.id;
  }

  io.emit("onlineUsers", Object.keys(userSocketMap));

  // --- TYPING ---
  socket.on("typing", ({ recieverId, senderName }) => {
    const receiverSocketId = getSocketId(recieverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: userID, senderName });
    }
  });

  socket.on("stopTyping", ({ recieverId }) => {
    const receiverSocketId = getSocketId(recieverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId: userID });
    }
  });

  // --- MESSAGE SEEN ---
  socket.on("messageSeen", async ({ messageIds, senderId }) => {
    try {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $addToSet: { seenBy: { userId: userID, seenAt: new Date() } } }
      );

      const senderSocketId = getSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageSeen", { messageIds, userId: userID });
      }
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

      const receiverSocketId = getSocketId(recieverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageEdited", updatedMessage);
      }

      const senderSocketId = getSocketId(userID);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageEdited", updatedMessage);
      }
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

      const receiverSocketId = getSocketId(recieverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId, deleteForEveryone, deletedBy: userID });
      }

      const senderSocketId = getSocketId(userID);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeleted", { messageId, deleteForEveryone, deletedBy: userID });
      }
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

      const receiverSocketId = getSocketId(recieverId);
      const data = { messageId, reactions: message.reactions };

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageReacted", data);
      }

      const senderSocketId = getSocketId(userID);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageReacted", data);
      }
    } catch (err) {
      console.error("Error reacting to message:", err);
    }
  });

  // --- CALL SIGNALING (WebRTC offer/answer/ICE relay only) ---
  socket.on("call:start", ({ to, offer, fromName, fromAvatar }) => {
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

    if (userID && userSocketMap[userID] === socket.id) {
      delete userSocketMap[userID];

      try {
        await User.findByIdAndUpdate(userID, { lastSeen: new Date() });

        const user = await User.findById(userID).select("lastSeen");
        io.emit("userLastSeen", { userId: userID, lastSeen: user?.lastSeen });
      } catch (err) {
        console.error("Error updating lastSeen:", err);
      }
    }

    io.emit("onlineUsers", Object.keys(userSocketMap));
  });
});

export { io, server, app };

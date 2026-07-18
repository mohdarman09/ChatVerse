import dotenv from "dotenv";
dotenv.config();

import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

const userSocketMap = {};

export const getSocketId = (userId) => {
  return userSocketMap[userId];
};

io.on("connection", (socket) => {
  console.log("✅ Socket Connected:", socket.id);

  const userID = socket.handshake.query.userId;
  console.log("User ID:", userID);

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

  // --- DISCONNECT ---
  socket.on("disconnect", async () => {
    console.log("❌ Socket Disconnected:", socket.id);

    if (userID) {
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

export { io, server, app, userSocketMap };

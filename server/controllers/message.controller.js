import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import { asyncHandler } from "../utilities/asyncHandler.utilitiy.js";
import { errorHandler } from "../utilities/errorHandler.utility.js";
import { getSocketId, io } from "../socket/socket.js";

export const sendMessage = asyncHandler(async (req, res, next) => {

    const senderId = req.user._id;
    const recieverId = req.params.recieverId;
    const { message, replyTo } = req.body;

    if (!senderId || !recieverId || !message) {
        return next(new errorHandler("All fields are required", 400));
    }

    let conversation = await Conversation.findOne({
        participants: { $all: [senderId, recieverId] }
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [senderId, recieverId]
        });
    }

    const messageData = { senderId, recieverId, message };
    if (replyTo) {
        messageData.replyTo = {
            messageId: replyTo.messageId,
            message: replyTo.message,
            senderId: replyTo.senderId,
            senderName: replyTo.senderName
        };
    }

    const newMessage = await Message.create(messageData);

    if (newMessage) {
        conversation.messages.push(newMessage._id);
        conversation.lastMessage = {
            message: newMessage.message.substring(0, 100),
            senderId: newMessage.senderId,
            createdAt: newMessage.createdAt
        };
        await conversation.save();
    }

    const socketId = getSocketId(recieverId);
    io.to(socketId).emit("newMessage", newMessage);

    res.status(200)
        .json({
            success: true,
            responseData: newMessage,
        })
});


export const getMessages = asyncHandler(async (req, res, next) => {

    const myId = req.user._id;
    const otherParticipantId = req.params.otherParticipantId;

    const conversation = await Conversation.findOne({
        participants: { $all: [myId, otherParticipantId] }
    }).populate("messages");

    const filteredMessages = conversation?.messages?.filter(msg => {
        if (String(msg.senderId) === String(myId) && msg.isDeletedForSender) return false;
        if (msg.isDeletedForEveryone) return false;
        return true;
    }) || [];

    res.status(200).json({
        success: true,
        responseData: {
            messages: filteredMessages,
            conversationId: conversation?._id
        },
    });
});


export const editMessage = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg) return next(new errorHandler("Message not found", 404));
    if (String(msg.senderId) !== String(userId)) return next(new errorHandler("Unauthorized", 403));

    const now = new Date();
    const msgTime = new Date(msg.createdAt);
    const diffMinutes = (now - msgTime) / (1000 * 60);
    if (diffMinutes > 10) return next(new errorHandler("Cannot edit message after 10 minutes", 400));

    msg.message = message;
    msg.isEdited = true;
    msg.editedAt = now;
    await msg.save();

    res.status(200).json({ success: true, responseData: msg });
});


export const deleteMessage = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const userId = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg) return next(new errorHandler("Message not found", 404));
    if (String(msg.senderId) !== String(userId)) return next(new errorHandler("Unauthorized", 403));

    if (deleteForEveryone) {
        msg.isDeletedForEveryone = true;
    } else {
        msg.isDeletedForSender = true;
    }
    msg.deletedAt = new Date();
    await msg.save();

    res.status(200).json({ success: true, responseData: msg });
});


export const reactToMessage = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const msg = await Message.findById(messageId);
    if (!msg) return next(new errorHandler("Message not found", 404));

    const existingReactionIndex = msg.reactions.findIndex(
        r => String(r.userId) === String(userId) && r.emoji === emoji
    );

    if (existingReactionIndex > -1) {
        msg.reactions.splice(existingReactionIndex, 1);
    } else {
        const existingUserReaction = msg.reactions.find(r => String(r.userId) === String(userId));
        if (existingUserReaction) {
            existingUserReaction.emoji = emoji;
            existingUserReaction.createdAt = new Date();
        } else {
            msg.reactions.push({ emoji, userId, createdAt: new Date() });
        }
    }

    await msg.save();

    res.status(200).json({ success: true, responseData: msg });
});


export const getConversations = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    const conversations = await Conversation.find({
        participants: { $in: [userId] }
    })
        .populate("participants", "fullName username avatar lastSeen")
        .sort({ updatedAt: -1 });

    const result = await Promise.all(conversations.map(async (conv) => {
        const otherUser = conv.participants.find(p => String(p._id) !== String(userId));

        const unreadCount = await Message.countDocuments({
            senderId: otherUser?._id,
            recieverId: userId,
            "seenBy.userId": { $ne: userId },
            isDeletedForEveryone: false
        });

        return {
            conversationId: conv._id,
            otherUser: otherUser ? {
                _id: otherUser._id,
                fullName: otherUser.fullName,
                username: otherUser.username,
                avatar: otherUser.avatar,
                lastSeen: otherUser.lastSeen
            } : null,
            lastMessage: conv.lastMessage || null,
            unreadCount
        };
    }));

    res.status(200).json({ success: true, responseData: result });
});

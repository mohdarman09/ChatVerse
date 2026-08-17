import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import CallLog from "../models/call.model.js";
import { asyncHandler } from "../utilities/asyncHandler.utilitiy.js";
import { errorHandler } from "../utilities/errorHandler.utility.js";
import { emitToUser } from "../socket/socket.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const sendMessage = asyncHandler(async (req, res, next) => {

    const senderId = req.user._id;
    const recieverId = req.params.recieverId;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(recieverId)) {
        return next(new errorHandler("Invalid user id", 400));
    }

    let messageText = message || '';
    let replyTo = req.body.replyTo;
    if (typeof replyTo === 'string') {
        try { replyTo = JSON.parse(replyTo); } catch { replyTo = undefined; }
    }

    if (!senderId || !recieverId) {
        return next(new errorHandler("All fields are required", 400));
    }

    let imageUrl = null;
    let messageType = 'text';

    if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: 'chatverse_images',
        });
        imageUrl = result.secure_url;
        messageType = 'image';
    }

    if (messageType === 'text' && !messageText) {
        return next(new errorHandler("Message is required", 400));
    }

    let conversation = await Conversation.findOne({
        participants: { $all: [senderId, recieverId] }
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [senderId, recieverId]
        });
    }

    const messageData = { senderId, recieverId, message: messageText, messageType };
    if (imageUrl) messageData.imageUrl = imageUrl;
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
        const lastMessageText = messageType === 'image' ? '[Image]' : newMessage.message.substring(0, 100);
        conversation.lastMessage = {
            message: lastMessageText,
            senderId: newMessage.senderId,
            createdAt: newMessage.createdAt
        };
        await conversation.save();
    }

    emitToUser(recieverId, "newMessage", newMessage);

    res.status(200)
        .json({
            success: true,
            responseData: newMessage,
        })
});


export const getMessages = asyncHandler(async (req, res, next) => {

    const myId = req.user._id;
    const otherParticipantId = req.params.otherParticipantId;

    if (!mongoose.Types.ObjectId.isValid(otherParticipantId)) {
        return next(new errorHandler("Invalid user id", 400));
    }

    await Message.updateMany(
        {
            senderId: otherParticipantId,
            recieverId: myId,
            "seenBy.userId": { $ne: myId }
        },
        {
            $push: { seenBy: { userId: myId, seenAt: new Date() } }
        }
    );

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
    const before = req.query.before;

    const conversation = await Conversation.findOne({
        participants: { $all: [myId, otherParticipantId] }
    });

    const andConditions = [
        {
            $or: [
                { senderId: myId, recieverId: otherParticipantId },
                { senderId: otherParticipantId, recieverId: myId },
            ],
        },
        { isDeletedForEveryone: { $ne: true } },
        { $nor: [{ senderId: myId, isDeletedForSender: true }] },
    ];

    if (before) {
        if (!mongoose.Types.ObjectId.isValid(before)) {
            return next(new errorHandler("Invalid cursor", 400));
        }
        andConditions.push({ _id: { $lt: before } });
    }

    const page = await Message.find({ $and: andConditions })
        .sort({ _id: -1 })
        .limit(limit + 1);

    const hasMore = page.length > limit;
    const messages = page.slice(0, limit).reverse();
    const nextCursor = hasMore ? String(messages[0]?._id) : null;

    const calls = await CallLog.find({
        $or: [
            { callerId: myId, receiverId: otherParticipantId },
            { callerId: otherParticipantId, receiverId: myId },
        ],
    }).sort({ createdAt: 1 });

    res.status(200).json({
        success: true,
        responseData: {
            messages,
            calls,
            conversationId: conversation?._id,
            hasMore,
            nextCursor
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

    const deleteData = { messageId: String(msg._id), deleteForEveryone: !!deleteForEveryone, deletedBy: String(userId) };
    emitToUser(String(userId), "messageDeleted", deleteData);
    if (deleteForEveryone) {
        emitToUser(String(msg.recieverId), "messageDeleted", deleteData);
    }

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

    const reactionData = { messageId: String(msg._id), reactions: msg.reactions };
    emitToUser(String(userId), "messageReacted", reactionData);
    emitToUser(String(msg.recieverId), "messageReacted", reactionData);

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
            unreadCount,
            updatedAt: conv.updatedAt
        };
    }));

    res.status(200).json({ success: true, responseData: result });
});

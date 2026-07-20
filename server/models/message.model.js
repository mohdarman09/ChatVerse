import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    recieverId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    messageType:{
        type: String,
        enum: ['text', 'image'],
        default: 'text'
    },
    message:{
        type: String,
        default: ''
    },
    imageUrl:{
        type: String,
        default: null
    },
    seenBy: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            seenAt: { type: Date, default: Date.now }
        }
    ],
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    isDeletedForSender: {
        type: Boolean,
        default: false
    },
    isDeletedForEveryone: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    },
    replyTo: {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
        message: String,
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        senderName: String
    },
    reactions: [
        {
            emoji: { type: String, required: true },
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);

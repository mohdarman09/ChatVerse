import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message"
        }
    ],
    lastMessage: {
        message: String,
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: Date
    }
}, { timestamps: true });

export default mongoose.model("Conversation", conversationSchema);

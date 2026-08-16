import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["completed", "missed", "rejected", "cancelled", "busy", "failed"],
      default: "missed",
    },
    startedAt: { type: Date },
    answerAt: { type: Date },
    endedAt: { type: Date },
    durationSec: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("CallLog", callLogSchema);
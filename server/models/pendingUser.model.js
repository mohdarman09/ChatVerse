import mongoose from "mongoose";

const pendingUserSchema = new mongoose.Schema({
    fullName:{
        type: String,
        required: true
    },
    username:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    password:{
        type: String,
        required: true
    },
    gender:{
        type: String,
        required: true
    },
    avatar:{
        type: String
    },
    otp:{
        type: String,
        required: true
    },
    otpExpiry:{
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }
    }
}, { timestamps: true });

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);
export default PendingUser;

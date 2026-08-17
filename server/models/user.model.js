import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName:{
        type: String,
        required: true
    },
    username:{
        type: String,
        required: true,
        unique: true
    },
    email:{
        type: String,
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
    lastSeen:{
        type: Date
    },
    blockedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;

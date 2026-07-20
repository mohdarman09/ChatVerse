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
        required: true,
        unique: true,
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
        type: String,
        required: true
    },
    lastSeen:{
        type: Date
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;

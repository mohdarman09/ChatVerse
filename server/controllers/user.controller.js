import User from "../models/user.model.js";
import { asyncHandler } from "../utilities/asyncHandler.utilitiy.js";
import { errorHandler } from "../utilities/errorHandler.utility.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateInitialsAvatar } from "../utilities/avatar.utility.js";

const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

const signToken = (userId) => {
    return jwt.sign({ _id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const setCookie = (res, token) => {
    res.cookie("token", token, {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: true,
        sameSite: 'None',
    });
};

export const register = asyncHandler(async (req, res, next) => {
    const { fullName, username, password, gender, avatar } = req.body;

    if (!fullName?.trim() || !username?.trim() || !password || !gender?.trim()) {
        return next(new errorHandler("All fields are required", 400));
    }

    const trimmedFullName = fullName.trim();
    const trimmedUsername = username.trim();

    if (!usernameRegex.test(trimmedUsername)) {
        return next(new errorHandler("Username must be 3-20 characters with only letters, numbers and underscore", 400));
    }

    if (typeof password !== "string" || password.length < 4) {
        return next(new errorHandler("Password must be at least 4 characters", 400));
    }

    const existingUser = await User.findOne({ username: trimmedUsername });

    if (existingUser) {
        return next(new errorHandler("Username already exists", 400));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        fullName: trimmedFullName,
        username: trimmedUsername,
        password: hashedPassword,
        gender: gender || 'male',
        avatar: avatar || generateInitialsAvatar(trimmedFullName, trimmedUsername),
    });

    const token = signToken(user._id);
    setCookie(res, token);

    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
        success: true,
        message: "Account created successfully",
        responseData: { user: userData, token }
    });
});

export const login = asyncHandler(async (req, res, next) => {
    const { username, password } = req.body;

    if (!username?.trim() || !password) {
        return next(new errorHandler("Please enter username and password", 400));
    }

    const user = await User.findOne({ username: username.trim() });

    if (!user) {
        return next(new errorHandler("Invalid credentials", 400));
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        return next(new errorHandler("Invalid credentials", 400));
    }

    const token = signToken(user._id);
    setCookie(res, token);

    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
        success: true,
        responseData: { user: userData, token }
    });
});

export const getProfile = asyncHandler(async (req, res, next) => {
    const userID = req.user._id;
    const profile = await User.findById(userID);

    res.status(200).json({
        success: true,
        responseData: { profile }
    });
});

export const logout = asyncHandler(async (req, res, next) => {
    res.status(200)
        .cookie("token", "", {
            expires: new Date(Date.now()),
            httpOnly: true,
        })
        .json({
            success: true,
            message: "Logout successfully!"
        })
});

export const searchUsers = asyncHandler(async (req, res, next) => {
    const query = (req.query.query || "").trim();
    const myId = req.user._id;

    if (!query) {
        return res.status(200)
            .json({
                success: true,
                responseData: [],
            })
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const users = await User.find({
        _id: { $ne: myId },
        $or: [{ username: regex }, { fullName: regex }],
    })
        .select("fullName username avatar lastSeen")
        .limit(20);

    res.status(200)
        .json({
            success: true,
            responseData: users,
        })
});

export const updateProfile = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const { fullName, username, removeAvatar } = req.body;

    if (!fullName?.trim() || !username?.trim()) {
        return next(new errorHandler("Full name and username are required", 400));
    }

    const trimmedFullName = fullName.trim();
    const trimmedUsername = username.trim();

    if (!usernameRegex.test(trimmedUsername)) {
        return next(new errorHandler("Username must be 3-20 characters with only letters, numbers and underscore", 400));
    }

    const existingUser = await User.findOne({ username: trimmedUsername, _id: { $ne: userId } });
    if (existingUser) {
        return next(new errorHandler("Username already taken", 400));
    }

    const updateData = { fullName: trimmedFullName, username: trimmedUsername };

    if (removeAvatar === 'true') {
        updateData.avatar = generateInitialsAvatar(trimmedFullName, trimmedUsername);
    } else if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        updateData.avatar = dataURI;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    res.status(200).json({
        success: true,
        responseData: { profile: updatedUser }
    });
});

export const changePassword = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return next(new errorHandler("All fields are required", 400));
    }

    if (typeof newPassword !== "string" || newPassword.length < 4) {
        return next(new errorHandler("Password must be at least 4 characters", 400));
    }

    if (newPassword !== confirmPassword) {
        return next(new errorHandler("New password and confirm password do not match", 400));
    }

    const user = await User.findById(userId);
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
        return next(new errorHandler("Current password is incorrect", 400));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: "Password changed successfully"
    });
});

export const deleteAccount = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    await User.findByIdAndDelete(userId);

    res.status(200)
        .cookie("token", "", {
            expires: new Date(Date.now()),
            httpOnly: true,
        })
        .json({
            success: true,
            message: "Account deleted successfully"
        });
});
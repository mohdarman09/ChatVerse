import User from "../models/user.model.js";
import PendingUser from "../models/pendingUser.model.js";
import { asyncHandler } from "../utilities/asyncHandler.utilitiy.js";
import { errorHandler } from "../utilities/errorHandler.utility.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateInitialsAvatar } from "../utilities/avatar.utility.js";
import { sendOTPEmail } from "../utilities/mailer.utility.js";

const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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
    const { fullName, username, email, password, gender, avatar } = req.body;

    if (!fullName?.trim() || !username?.trim() || !email?.trim() || !password) {
        return next(new errorHandler("All fields are required", 400));
    }

    const trimmedFullName = fullName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(trimmedEmail)) {
        return next(new errorHandler("Invalid email format", 400));
    }

    if (!usernameRegex.test(trimmedUsername)) {
        return next(new errorHandler("Username must be 3-20 characters with only letters, numbers and underscore", 400));
    }

    if (!passwordRegex.test(password)) {
        return next(new errorHandler("Password must be at least 8 characters with uppercase, lowercase, number and special character", 400));
    }

    const [existingUser, existingEmail] = await Promise.all([
        User.findOne({ username: trimmedUsername }),
        User.findOne({ email: trimmedEmail })
    ]);

    if (existingUser) {
        return next(new errorHandler("Username already exists", 400));
    }

    if (existingEmail) {
        return next(new errorHandler("Email already in use", 400));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    await PendingUser.create({
        fullName: trimmedFullName,
        username: trimmedUsername,
        email: trimmedEmail,
        password: hashedPassword,
        gender: gender || 'male',
        avatar: avatar || null,
        otp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendOTPEmail(trimmedEmail, otp, 'verification');

    res.status(201).json({
        success: true,
        message: "OTP sent to your email. Please verify to continue.",
        responseData: {
            email: trimmedEmail,
        }
    });
});

export const verifyOTP = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return next(new errorHandler("Email and OTP are required", 400));
    }

    const pending = await PendingUser.findOne({ email: email.trim().toLowerCase() });
    if (!pending) {
        return next(new errorHandler("No pending registration found. Please register again.", 404));
    }

    if (pending.otp !== otp) {
        return next(new errorHandler("Invalid OTP", 400));
    }

    if (new Date() > pending.otpExpiry) {
        await PendingUser.deleteOne({ _id: pending._id });
        return next(new errorHandler("OTP has expired. Please register again.", 400));
    }

    const avatar = pending.avatar || generateInitialsAvatar(pending.fullName, pending.username);

    const user = await User.create({
        fullName: pending.fullName,
        username: pending.username,
        email: pending.email,
        password: pending.password,
        gender: pending.gender,
        avatar,
    });

    await PendingUser.deleteOne({ _id: pending._id });

    const token = signToken(user._id);
    setCookie(res, token);

    res.status(201).json({
        success: true,
        message: "Email verified successfully!",
        responseData: { user, token }
    });
});

export const resendOTP = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new errorHandler("Email is required", 400));
    }

    const pending = await PendingUser.findOne({ email: email.trim().toLowerCase() });
    if (!pending) {
        return next(new errorHandler("No pending registration found. Please register again.", 404));
    }

    const otp = generateOTP();
    pending.otp = otp;
    pending.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await pending.save();

    await sendOTPEmail(pending.email, otp, 'verification');

    res.status(200).json({
        success: true,
        message: "OTP resent to your email"
    });
});

export const login = asyncHandler(async (req, res, next) => {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
        return next(new errorHandler("Please enter email/username and password", 400));
    }

    const isEmail = emailRegex.test(usernameOrEmail.trim().toLowerCase());

    const user = isEmail
        ? await User.findOne({ email: usernameOrEmail.trim().toLowerCase() })
        : await User.findOne({ username: usernameOrEmail.trim() });

    if (!user) {
        return next(new errorHandler("Invalid credentials", 400));
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        return next(new errorHandler("Invalid credentials", 400));
    }

    const token = signToken(user._id);
    setCookie(res, token);

    res.status(200).json({
        success: true,
        responseData: { user, token }
    });
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new errorHandler("Email is required", 400));
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
        return next(new errorHandler("No account found with this email", 404));
    }

    const otp = generateOTP();
    user.emailOTP = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTPEmail(user.email, otp, 'reset');

    res.status(200).json({
        success: true,
        message: "OTP sent to your email",
        responseData: { email: user.email }
    });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
        return next(new errorHandler("All fields are required", 400));
    }

    if (newPassword !== confirmPassword) {
        return next(new errorHandler("Passwords do not match", 400));
    }

    if (!passwordRegex.test(newPassword)) {
        return next(new errorHandler("Password must be at least 8 characters with uppercase, lowercase, number and special character", 400));
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
        return next(new errorHandler("User not found", 404));
    }

    if (user.emailOTP !== otp) {
        return next(new errorHandler("Invalid OTP", 400));
    }

    if (new Date() > user.otpExpiry) {
        return next(new errorHandler("OTP has expired. Please request a new one.", 400));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.emailOTP = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message: "Password reset successfully. You can now login."
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

export const getOtherUsers = asyncHandler(async (req, res, next) => {
    const otherUsers = await User.find({ _id: { $ne: req.user._id } });

    res.status(200)
        .json({
            success: true,
            responseData: otherUsers,
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

    if (!passwordRegex.test(newPassword)) {
        return next(new errorHandler("Password must be at least 8 characters with uppercase, lowercase, number and special character", 400));
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
import User from "../models/user.model.js";
import { asyncHandler } from "../utilities/asyncHandler.utilitiy.js";
import { errorHandler } from "../utilities/errorHandler.utility.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


export const register = asyncHandler(async (req, res, next) => {
    const { fullName, username, email, password, gender } = req.body;

    if (!fullName?.trim() || !username?.trim() || !email?.trim() || !password || !gender) {
        return next(new errorHandler("All fields are required", 400));
    }

    const trimmedFullName = fullName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
        return next(new errorHandler("Invalid email format", 400));
    }

    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
        return next(new errorHandler("Username already exists", 400));
    }

    const existingEmail = await User.findOne({ email: trimmedEmail });
    if (existingEmail) {
        return next(new errorHandler("Email already in use", 400));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const avatar = `https://ui-avatars.com/api/?name=${trimmedFullName}&background=random`;

    const newUser = await User.create({
        fullName: trimmedFullName,
        username: trimmedUsername,
        email: trimmedEmail,
        password: hashedPassword,
        gender,
        avatar,
    })

    const datatoken = {
        _id: newUser._id,
    }
    const token = jwt.sign(datatoken, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res
        .status(201)
        .cookie("token", token, {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000), // Convert days to milliseconds
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        })
        .json({
            success: true,
            responseData: {
                newUser,
                token
            }
        })
});


export const login = asyncHandler(async (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return next(new errorHandler("Please enter a valid username and password", 400));
    }

    const user = await User.findOne({ username });
    if (!user) {
        return next(new errorHandler("Please enter a valid username and password", 400));
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        return next(new errorHandler("Please enter a valid username and password", 400));
    }

    const datatoken = {
        _id: user._id,
    }
    const token = jwt.sign(datatoken, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.status(201)
        .cookie("token", token, {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000), // Convert days to milliseconds
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            // domain: process.env.CLIENT_URL
        })
        .json({
            success: true,
            responseData: {
                user,
                token
            }
        })
});


export const getProfile = asyncHandler(async (req, res, next) => {

    const userID = req.user._id;
    console.log(userID)

    const profile = await User.findById(userID);

    res.status(200).json({
        success: true,
        responseData: {
            profile
        }
    })
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
    const { fullName, username } = req.body;

    if (!fullName?.trim() || !username?.trim()) {
        return next(new errorHandler("Full name and username are required", 400));
    }

    const trimmedFullName = fullName.trim();
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3) {
        return next(new errorHandler("Username must be at least 3 characters", 400));
    }

    const existingUser = await User.findOne({ username: trimmedUsername, _id: { $ne: userId } });
    if (existingUser) {
        return next(new errorHandler("Username already taken", 400));
    }

    const updateData = { fullName: trimmedFullName, username: trimmedUsername };

    if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        updateData.avatar = dataURI;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    res.status(200).json({
        success: true,
        responseData: {
            profile: updatedUser
        }
    });
});

export const changePassword = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return next(new errorHandler("All fields are required", 400));
    }

    if (newPassword.length < 8) {
        return next(new errorHandler("New password must be at least 8 characters", 400));
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
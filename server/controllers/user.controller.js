import { response } from "express";
import User from "../models/user.model.js";
import { asyncHandler } from "../utilities/asyncHandler.utilitiy.js";
import { errorHandler } from "../utilities/errorHandler.utility.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


export const register = asyncHandler(async (req, res, next) => {
    const { fullName, username, password, gender } = req.body;

    if (!fullName || !username || !password || !gender) {
        return next(new errorHandler("All fields are required", 400));
    }

    const user = await User.findOne({ username });
    if (user) {
        return next(new errorHandler("Username already exists", 400));
    }

    //for passwrod encryption we will use bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10);

    const avatar = `https://ui-avatars.com/api/?name=${fullName}&background=random`;

    const newUser = await User.create({
        fullName,
        username,
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
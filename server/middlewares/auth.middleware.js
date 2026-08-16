import { asyncHandler } from "../utilities/asyncHandler.utilitiy.js";
import { errorHandler } from "../utilities/errorHandler.utility.js";
import jwt from 'jsonwebtoken';
import User from "../models/user.model.js";

export const isAuthenticated = asyncHandler(async (req, res, next) => {

    const token =
        req.cookies?.token ||
        req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
        return next(new errorHandler("Invalid token", 400));
    }

    let tokenData;
    try {
        tokenData = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return next(new errorHandler("Invalid token", 400));
    }

    req.user = tokenData;
    next();
});
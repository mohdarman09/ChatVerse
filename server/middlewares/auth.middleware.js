import { asyncHandler } from "../utilities/asyncHandler.utilitiy.js";
import { errorHandler } from "../utilities/errorHandler.utility.js";
import jwt from 'jsonwebtoken';
import User from "../models/user.model.js";

export const isAuthenticated = asyncHandler(async (req, res, next) => {

    const token =
        req.cookies?.token ||
        req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
        return next(new errorHandler("Session expired. Please log in again.", 401));
    }

    let tokenData;
    try {
        tokenData = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return next(new errorHandler("Session expired. Please log in again.", 401));
    }

    // Verify the user still exists in the database.
    // This prevents deleted accounts from continuing to use an old valid JWT.
    const userExists = await User.exists({ _id: tokenData._id });
    if (!userExists) {
        return next(new errorHandler("Account no longer exists. Please log in again.", 401));
    }

    req.user = tokenData;
    next();
});
export const errorMiddleware = (err, req, res, next) => {
    // --- MongoDB duplicate key (E11000) ---
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        err.statusCode = 409;
        if (field === 'username') {
            err.message = "This username is already taken. Please choose another one.";
        } else if (field && field !== 'email') {
            err.message = `${field} already exists`;
        } else {
            // Fallback — never mention email in this username-based app
            err.message = "This username is already taken. Please choose another one.";
        }
    }

    // --- Mongoose validation errors ---
    if (err.name === 'ValidationError') {
        err.statusCode = 400;
        const messages = Object.values(err.errors || {}).map(e => e.message);
        err.message = messages[0] || "Validation failed. Please check your input.";
    }

    // --- JWT errors (should not bubble here normally, but just in case) ---
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        err.statusCode = 401;
        err.message = "Session expired. Please log in again.";
    }

    // Finalise status code
    err.statusCode = err.statusCode || 500;

    // For 500 errors never leak internal details to the client
    const isInternalError = err.statusCode >= 500;
    const clientMessage = isInternalError
        ? "Something went wrong. Please try again later."
        : (err.message || "Something went wrong. Please try again later.");

    // Always log full details server-side
    console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${err.statusCode}`);
    console.error('   message:', err.message);
    if (err.code) console.error('   code:', err.code);
    if (isInternalError) console.error('   stack:', err.stack);

    res.status(err.statusCode).json({
        success: false,
        message: clientMessage
    });
};
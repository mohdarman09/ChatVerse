export const errorMiddleware = (err, req, res, next) => {
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        err.statusCode = 400;
        err.message = field === "username" ? "Username already exists" : `${field || "Value"} already exists`;
    }

    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${err.statusCode}`);
    console.error('   error.message:', err.message);
    console.error('   error.code:', err.code || 'N/A');
    console.error('   error.command:', err.command || 'N/A');
    console.error('   error.stack:', err.stack);

    res.status(err.statusCode).json({
        success: false,
        message: err.message
    });
}
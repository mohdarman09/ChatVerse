export const asyncHandler = (func) => (req, res, next) => {
    Promise.resolve(func(req, res, next)).catch((err) => {
        console.error("========== ASYNC ERROR ==========");
        console.error(err);
        console.error(err.stack);
        next(err);
    });
};
import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const MONGODB_URL = process.env.MONGODB_URL;
        const instance = await mongoose.connect(MONGODB_URL);
        console.log(`MongoDB connected: ${instance.connection.host}`);
    }
    catch (error) {
        console.error("Failed to connect to MongoDB:", error);
    }
};
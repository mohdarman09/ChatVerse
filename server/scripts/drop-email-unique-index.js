import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
    const MONGODB_URL = process.env.MONGODB_URL;
    if (!MONGODB_URL) {
        console.error("MONGODB_URL is not set. Aborting.");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URL);
        const db = mongoose.connection.db;

        const collections = await db.listCollections({ name: "users" }).toArray();
        if (collections.length === 0) {
            console.log("users collection not found - nothing to do.");
            process.exit(0);
        }

        const indexes = await db.collection("users").indexes();
        const emailIndex = indexes.find((i) => i.key && i.key.email === 1);

        if (!emailIndex) {
            console.log("No index on users.email found - nothing to do.");
            process.exit(0);
        }

        if (!emailIndex.unique) {
            console.log(`Index ${emailIndex.name} on users.email exists but is NOT unique - nothing to do.`);
            process.exit(0);
        }

        await db.collection("users").dropIndex(emailIndex.name);
        console.log(`Dropped unique index ${emailIndex.name} from users collection.`);
        console.log("Users without an email can now be created without duplicate-key errors.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
};

run();
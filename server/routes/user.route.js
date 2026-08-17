import express from 'express';
import {
    searchUsers,
    getProfile,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
    deleteAccount,
    getUserProfileById,
    blockUser,
    unblockUser,
    getBlockedUsers
} from '../controllers/user.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', isAuthenticated, logout);
router.get('/get-profile', isAuthenticated, getProfile);
router.get('/profile/:userId', isAuthenticated, getUserProfileById);
router.post('/block/:userId', isAuthenticated, blockUser);
router.post('/unblock/:userId', isAuthenticated, unblockUser);
router.get('/blocked-users', isAuthenticated, getBlockedUsers);
router.get('/search', isAuthenticated, searchUsers);
router.patch('/update-profile', isAuthenticated, upload.single('avatar'), updateProfile);
router.post('/change-password', isAuthenticated, changePassword);
router.delete('/delete-account', isAuthenticated, deleteAccount);

export default router;
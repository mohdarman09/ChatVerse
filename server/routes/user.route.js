import express from 'express';
import { getOtherUsers, getProfile, login, logout, register, updateProfile, changePassword, deleteAccount } from '../controllers/user.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', isAuthenticated, logout);
router.get('/get-profile', isAuthenticated, getProfile );
router.get('/get-other-users', isAuthenticated, getOtherUsers );
router.patch('/update-profile', isAuthenticated, upload.single('avatar'), updateProfile);
router.post('/change-password', isAuthenticated, changePassword);
router.delete('/delete-account', isAuthenticated, deleteAccount);


export default router;
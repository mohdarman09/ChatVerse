import express from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { getMessages, sendMessage, editMessage, deleteMessage, reactToMessage, getConversations } from '../controllers/message.controller.js';

const router = express.Router();

router.post('/send/:recieverId', isAuthenticated, sendMessage);
router.get('/get-messages/:otherParticipantId', isAuthenticated, getMessages);
router.patch('/edit/:messageId', isAuthenticated, editMessage);
router.delete('/delete/:messageId', isAuthenticated, deleteMessage);
router.post('/react/:messageId', isAuthenticated, reactToMessage);
router.get('/conversations', isAuthenticated, getConversations);

export default router;

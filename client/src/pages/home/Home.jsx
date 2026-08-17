import { useEffect, useState, useRef } from 'react'
import UserSidebar from './UserSidebar'
import MessageContainer from './MessageContainer'
import { useDispatch, useSelector } from 'react-redux';
import { getUserProfileThunk } from '../../store/slice/user/user.thunk';
import { initializeSocket, setOnlineUsers } from '../../store/slice/socket/socket.slice';
import {
  setNewMessage,
  addCallLog,
  setMessagesSeen,
  editMessageInStore,
  deleteMessageFromStore,
  updateMessageReactions,
  setTypingUsers,
} from '../../store/slice/message/message.slice';
import { getConversationsThunk } from '../../store/slice/message/message.thunk';
import { setUserLastSeen } from '../../store/slice/user/user.slice';
import CallProvider from '../../context/CallContext';
import CallUI from '../../components/CallUI';

function Home() {

  const dispatch = useDispatch();
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    dispatch(getUserProfileThunk());
  }, []);

  const { isAuthenticated, userProfile, selectedUser } = useSelector(state => state.userReducer);
  const { socket } = useSelector(state => state.socketReducer);
  const { unreadCounts, conversations, conversationsStale } = useSelector(state => state.messageReducer);

  const selectedUserRef = useRef(selectedUser);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if (conversationsStale) {
      dispatch(getConversationsThunk());
    }
  }, [conversationsStale]);

  useEffect(() => {
    if (!isAuthenticated || !userProfile?.profile?._id) return;
    dispatch(initializeSocket(userProfile.profile._id));
  }, [isAuthenticated, userProfile]);

  useEffect(() => {
    if (!isAuthenticated && socket) {
      socket.disconnect();
    }
  }, [isAuthenticated, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleOnlineUsers = (onlineUsers) => {
      dispatch(setOnlineUsers(onlineUsers));
    };

    const handleNewMessage = (newMessage) => {
      dispatch(setNewMessage({
        message: newMessage,
        selectedUserId: selectedUserRef.current?._id,
        currentUserId: userProfile?.profile?._id,
      }));
    };

    const handleTyping = ({ senderId, senderName }) => {
      dispatch(setTypingUsers({ userId: senderId, isTyping: true, name: senderName }));
    };

    const handleStopTyping = ({ senderId }) => {
      dispatch(setTypingUsers({ userId: senderId, isTyping: false }));
    };

    const handleMessageSeen = ({ messageIds, userId }) => {
      dispatch(setMessagesSeen({ messageIds, userId }));
    };

    const handleMessageEdited = (updatedMessage) => {
      dispatch(editMessageInStore(updatedMessage));
    };

    const handleMessageDeleted = ({ messageId, deleteForEveryone }) => {
      dispatch(deleteMessageFromStore({ messageId, deleteForEveryone }));
    };

    const handleMessageReacted = ({ messageId, reactions }) => {
      dispatch(updateMessageReactions({ messageId, reactions }));
    };

    const handleCallHistory = ({ log, peerId }) => {
      const current = selectedUserRef.current;
      if (current?._id && String(peerId) === String(current._id)) {
        dispatch(addCallLog({ log, peerId }));
      }
    };

    const handleUserLastSeen = ({ userId, lastSeen }) => {
      dispatch(setUserLastSeen({ userId, lastSeen }));
    };

    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("newMessage", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("messageSeen", handleMessageSeen);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageReacted", handleMessageReacted);
    socket.on("callHistory", handleCallHistory);
    socket.on("userLastSeen", handleUserLastSeen);

    return () => {
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("newMessage", handleNewMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("messageSeen", handleMessageSeen);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messageReacted", handleMessageReacted);
      socket.off("callHistory", handleCallHistory);
      socket.off("userLastSeen", handleUserLastSeen);
    }
  }, [socket, userProfile]);

  const totalUnread = Object.values(unreadCounts || {}).reduce((a, b) => a + b, 0);

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) ChatVerse` : 'ChatVerse';
  }, [totalUnread]);

  useEffect(() => {
    if (!socket) return;
    const handleBrowserNotification = (newMessage) => {
      const currentSelectedUser = selectedUserRef.current;
      if (document.hidden && String(newMessage.senderId) !== String(currentSelectedUser?._id)) {
        if ('Notification' in window && Notification.permission === 'granted') {
          const otherUser = conversationsRef.current?.find(
            c => String(c.otherUser?._id) === String(newMessage.senderId)
          )?.otherUser;
          new Notification(`ChatVerse - ${otherUser?.fullName || 'New message'}`, {
            body: newMessage.messageType === 'image' ? '📷 Image' : (newMessage.message?.substring(0, 100) || ''),
            icon: otherUser?.avatar,
          });
        }
      }
    };

    socket.on("newMessage", handleBrowserNotification);

    return () => {
      socket.off("newMessage", handleBrowserNotification);
    };
  }, [socket]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Mobile layout: dedicated full-screen screens
  const content = isMobile
    ? (showMobileChat
      ? <MessageContainer isMobile={true} onBack={() => setShowMobileChat(false)} />
      : <UserSidebar isMobile={true} onSelectUser={() => setShowMobileChat(true)} />)
    : (
      <div className='flex h-screen bg-[var(--bg-primary)] overflow-hidden'>
        <div
          className={`${showMobileChat ? 'hidden' : 'flex'}
            lg:flex w-full lg:w-80 xl:w-96 flex-shrink-0`}
        >
          <UserSidebar onSelectUser={() => setShowMobileChat(true)} />
        </div>

        <div
          className={`${!showMobileChat ? 'hidden' : 'flex'}
            lg:flex flex-1 min-w-0`}
        >
          <MessageContainer onBack={() => setShowMobileChat(false)} />
        </div>
      </div>
    );

  return (
    <CallProvider>
      {content}
      <CallUI />
    </CallProvider>
  )
}

export default Home
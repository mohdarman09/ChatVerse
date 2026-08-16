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
    if (!socket) return;

    socket.on("onlineUsers", (onlineUsers) => {
      dispatch(setOnlineUsers(onlineUsers));
    });

    socket.on("newMessage", (newMessage) => {
      dispatch(setNewMessage({ message: newMessage, selectedUserId: selectedUserRef.current?._id }));
    });

    socket.on("typing", ({ senderId, senderName }) => {
      dispatch(setTypingUsers({ userId: senderId, isTyping: true, name: senderName }));
    });

    socket.on("stopTyping", ({ senderId }) => {
      dispatch(setTypingUsers({ userId: senderId, isTyping: false }));
    });

    socket.on("messageSeen", ({ messageIds, userId }) => {
      dispatch(setMessagesSeen({ messageIds, userId }));
    });

    socket.on("messageEdited", (updatedMessage) => {
      dispatch(editMessageInStore(updatedMessage));
    });

    socket.on("messageDeleted", ({ messageId, deleteForEveryone }) => {
      dispatch(deleteMessageFromStore({ messageId, deleteForEveryone }));
    });

    socket.on("messageReacted", ({ messageId, reactions }) => {
      dispatch(updateMessageReactions({ messageId, reactions }));
    });

    socket.on("callHistory", ({ log, peerId }) => {
      const current = selectedUserRef.current;
      if (current?._id && String(peerId) === String(current._id)) {
        dispatch(addCallLog({ log, peerId }));
      }
    });

    socket.on("userLastSeen", ({ userId, lastSeen }) => {
      dispatch(setUserLastSeen({ userId, lastSeen }));
    });

    return () => {
      socket.off("onlineUsers");
      socket.off("newMessage");
      socket.off("typing");
      socket.off("stopTyping");
      socket.off("messageSeen");
      socket.off("messageEdited");
      socket.off("messageDeleted");
      socket.off("messageReacted");
      socket.off("callHistory");
      socket.off("userLastSeen");
      socket.disconnect();
    }
  }, [socket]);

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
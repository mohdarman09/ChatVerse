import React, { useEffect, useState, useRef } from 'react'
import UserSidebar from './UserSidebar'
import MessageContainer from './MessageContainer'
import { useDispatch, useSelector } from 'react-redux';
import { getOtherUsersThunk, getUserProfileThunk } from '../../store/slice/user/user.thunk';
import { initializeSocket, setOnlineUsers } from '../../store/slice/socket/socket.slice';
import {
  setNewMessage,
  setMessagesSeen,
  editMessageInStore,
  deleteMessageFromStore,
  updateMessageReactions,
  setTypingUsers,
} from '../../store/slice/message/message.slice';
import { setUserLastSeen } from '../../store/slice/user/user.slice';

function Home() {

  const dispatch = useDispatch();
  const [showMobileChat, setShowMobileChat] = useState(false);

  useEffect(() => {
    dispatch(getUserProfileThunk());
    dispatch(getOtherUsersThunk());
  }, []);

  const { isAuthenticated, userProfile, selectedUser, otherUsers } = useSelector(state => state.userReducer);
  const { socket } = useSelector(state => state.socketReducer);
  const { unreadCounts } = useSelector(state => state.messageReducer);

  const selectedUserRef = useRef(selectedUser);
  const otherUsersRef = useRef(otherUsers);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);
  useEffect(() => {
    otherUsersRef.current = otherUsers;
  }, [otherUsers]);

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
      const currentOtherUsers = otherUsersRef.current;
      if (document.hidden && String(newMessage.senderId) !== String(currentSelectedUser?._id)) {
        if ('Notification' in window && Notification.permission === 'granted') {
          const sender = currentOtherUsers?.find(u => u._id === newMessage.senderId);
          new Notification(`ChatVerse - ${sender?.fullName || 'New message'}`, {
            body: newMessage.message?.substring(0, 100),
            icon: sender?.avatar,
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

  return (
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
  )
}

export default Home

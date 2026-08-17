import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Message from './Message'
import { useDispatch, useSelector } from 'react-redux';
import { getMessageThunk, loadOlderMessagesThunk } from '../../store/slice/message/message.thunk';
import { resetUnreadCount } from '../../store/slice/message/message.slice';
import SendMessage from './SendMessage';
import TypingIndicator from '../../components/TypingIndicator';
import DateSeparator from '../../components/DateSeparator';
import MessageSearch from '../../components/MessageSearch';
import { IoArrowBack, IoSearch } from 'react-icons/io5';
import { BsChatDots, BsTelephone } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import { useCall } from '../../context/CallContext';

function MessageContainer({ onBack, isMobile }) {

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedUser, userProfile } = useSelector(state => state.userReducer);
  const { messages, buttonLoading, hasMore, nextCursor, loadingOlder } = useSelector(state => state.messageReducer);
  const { onlineUsers, socket } = useSelector(state => state.socketReducer);
  const { startCall } = useCall();
  const isUserOnline = onlineUsers?.includes(selectedUser?._id);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const scrollAdjustRef = useRef(null);
  const isInitialChatLoadRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const prevUserIdRef = useRef(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // When selected user changes, mark for fresh initial instant scroll to bottom
  useEffect(() => {
    scrollAdjustRef.current = null;
    if (selectedUser?._id) {
      if (prevUserIdRef.current !== selectedUser._id) {
        prevUserIdRef.current = selectedUser._id;
        isInitialChatLoadRef.current = true;
        isAtBottomRef.current = true;
        setIsAtBottom(true);
      }
      dispatch(getMessageThunk({ recieverId: selectedUser._id }));
      dispatch(resetUnreadCount(selectedUser._id));
    }
  }, [selectedUser, dispatch]);

  // Mark unseen messages as seen
  useEffect(() => {
    if (!selectedUser?._id || !socket) return;
    const unreadMessages = messages.filter(
      m => String(m.senderId) === String(selectedUser._id) && (!m.seenBy || m.seenBy.length === 0)
    );
    if (unreadMessages.length > 0) {
      socket.emit("messageSeen", {
        messageIds: unreadMessages.map(m => m._id),
        senderId: selectedUser._id,
      });
    }
  }, [selectedUser, socket, messages]);

  // Handle instant positioning and message updates
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // 1. Pagination scroll height restoration
    if (scrollAdjustRef.current) {
      const { prevScrollHeight, prevScrollTop } = scrollAdjustRef.current;
      scrollAdjustRef.current = null;
      container.scrollTop = container.scrollHeight - prevScrollHeight + prevScrollTop;
      return;
    }

    // 2. Initial load for a chat - jump instantly to the bottom with zero animation
    if (isInitialChatLoadRef.current && messages?.length > 0) {
      container.scrollTop = container.scrollHeight;
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight;
          isInitialChatLoadRef.current = false;
        }
      });
      return;
    }

    // 3. New message arrives / user sends message - auto-scroll only if user is already at bottom
    if (isAtBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);

    if (
      container.scrollTop < 120 &&
      hasMore &&
      !loadingOlder &&
      !scrollAdjustRef.current &&
      selectedUser?._id &&
      nextCursor
    ) {
      scrollAdjustRef.current = {
        prevScrollHeight: container.scrollHeight,
        prevScrollTop: container.scrollTop,
      };
      dispatch(loadOlderMessagesThunk({ recieverId: selectedUser._id, before: nextCursor }));
    }
  }, [hasMore, loadingOlder, nextCursor, selectedUser, dispatch]);

  const handleReply = useCallback((message) => {
    setReplyTo({
      messageId: message._id,
      message: message.message,
      senderId: message.senderId,
      senderName: String(message.senderId) === String(userProfile?.profile?._id)
        ? userProfile?.profile?.fullName
        : selectedUser?.fullName,
    });
  }, [userProfile, selectedUser]);

  const handleStartEdit = useCallback((message) => {
    setEditingMessage(message);
  }, []);

  const cancelReply = useCallback(() => setReplyTo(null), []);
  const cancelEdit = useCallback(() => setEditingMessage(null), []);

  useEffect(() => {
    const handler = (e) => setPreviewImage(e.detail);
    window.addEventListener('openImagePreview', handler);
    return () => window.removeEventListener('openImagePreview', handler);
  }, []);

  const scrollToMessage = useCallback((messageId) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add('bg-primary/5');
      setTimeout(() => el.classList.remove('bg-primary/5'), 2000);
    }
  }, []);

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(m => m.message?.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;
    filteredMessages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', date: msg.createdAt });
      }
      groups.push({ type: 'message', message: msg });
    });
    return groups;
  }, [filteredMessages]);

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center animate-fade-in px-4">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/5">
            <BsChatDots className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold gradient-text mb-2">Welcome to ChatVerse</h2>
          <p className="text-[var(--text-secondary)]">Select a conversation to start chatting</p>
        </div>
      </div>
    )
  }

  // Mobile layout: dedicated full-screen chat
  if (isMobile) {
    return (
      <div className="w-full h-dvh flex flex-col bg-[var(--bg-primary)]">
        <div className="sticky top-0 z-10 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] safe-top-mobile">
          <div className="flex items-center gap-3 px-2 py-2">
            <button
              onClick={onBack}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--user-hover-bg)] transition-all"
              aria-label="Back to conversations"
            >
              <IoArrowBack className="w-6 h-6" />
            </button>
            <div
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
              onClick={() => selectedUser?._id && navigate(`/profile/${selectedUser._id}`)}
              title="View profile"
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all">
                  <Avatar
                    src={selectedUser?.avatar}
                    name={selectedUser?.fullName}
                    seed={selectedUser?.username}
                    className="w-full h-full"
                  />
                </div>
                {isUserOnline && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-secondary)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)] truncate group-hover:text-primary transition-colors">
                  {selectedUser?.fullName}
                </h2>
                <p className={`text-[12px] ${isUserOnline ? 'text-green-500 font-medium' : 'text-[var(--text-muted)]'}`}>
                  {isUserOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <button
              onClick={() => startCall(selectedUser)}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--user-hover-bg)] transition-all"
              aria-label="Audio call"
            >
              <BsTelephone className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${showSearch ? 'bg-primary/20 text-primary' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--user-hover-bg)]'}`}
              aria-label="Search messages"
            >
              <IoSearch className="w-5 h-5" />
            </button>
          </div>
          {showSearch && (
            <MessageSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} messageCount={filteredMessages.length} />
          )}
        </div>

        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          {!buttonLoading && messages?.length > 0 && !hasMore && (
            <div className="flex justify-center pt-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest bg-white/5 rounded-full px-3 py-1">
                Beginning of conversation
              </div>
            </div>
          )}

          {loadingOlder && (
            <div className="flex justify-center py-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {buttonLoading && messages?.length === 0 ? (
            <div className="space-y-4 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} gap-3 animate-fade-in`}>
                  {i % 2 !== 0 && <div className="w-8 h-8 rounded-full skeleton flex-shrink-0" />}
                  <div className={`space-y-2 ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
                    <div className={`h-10 skeleton rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
                    <div className="h-3 w-16 skeleton rounded" />
                  </div>
                  {i % 2 === 0 && <div className="w-8 h-8 rounded-full skeleton flex-shrink-0" />}
                </div>
              ))}
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <BsChatDots className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400 text-sm font-medium">No messages yet</p>
                <p className="text-gray-600 text-xs mt-1">Send a message to start the conversation</p>
              </div>
            </div>
          ) : filteredMessages?.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-sm">No messages match your search</p>
            </div>
          ) : (
            <div className="px-3 pt-3 pb-4">
              {groupedMessages.map((item, index) => {
                if (item.type === 'date') {
                  return <DateSeparator key={`date-${index}`} date={item.date} />;
                }
                const msg = item.message;
                return (
                  <div
                    key={msg._id || index}
                    id={`message-${msg._id}`}
                  >
                    <Message
                      isMobile={true}
                      messageDetails={msg}
                      onReply={handleReply}
                      onStartEdit={handleStartEdit}
                      onScrollToMessage={scrollToMessage}
                      searchQuery={searchQuery}
                    />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="px-3">
            <TypingIndicator userId={selectedUser?._id} />
          </div>
        </div>

        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 animate-fade-in"
            onClick={() => setPreviewImage(null)}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-10 hover:scale-105"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <SendMessage
          isMobile={true}
          replyTo={replyTo}
          onCancelReply={cancelReply}
          editingMessage={editingMessage}
          onCancelEdit={cancelEdit}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex-1 flex flex-col h-screen bg-[var(--bg-primary)]">
      <div className="sticky top-0 z-10 glass border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3 p-3">
          <button
            onClick={onBack}
            className="lg:hidden p-2 rounded-xl hover:bg-[var(--user-hover-bg)] transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Back to conversations"
          >
            <IoArrowBack className="w-5 h-5" />
          </button>
          <div
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
            onClick={() => selectedUser?._id && navigate(`/profile/${selectedUser._id}`)}
            title="View profile"
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all">
                <Avatar
                  src={selectedUser?.avatar}
                  name={selectedUser?.fullName}
                  seed={selectedUser?.username}
                  className="w-full h-full"
                />
              </div>
              {isUserOnline && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-secondary)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-[var(--text-primary)] truncate group-hover:text-primary transition-colors">
                {selectedUser?.fullName}
              </h2>
              <p className={`text-xs ${isUserOnline ? 'text-green-500 font-medium' : 'text-[var(--text-muted)]'}`}>
                {isUserOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          <button
            onClick={() => startCall(selectedUser)}
            className="p-2 rounded-xl transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--user-hover-bg)]"
            aria-label="Audio call"
          >
            <BsTelephone className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-xl transition-all duration-200 ${showSearch ? 'bg-primary/20 text-primary' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--user-hover-bg)]'}`}
            aria-label="Search messages"
          >
            <IoSearch className="w-5 h-5" />
          </button>
        </div>
        {showSearch && (
          <MessageSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} messageCount={filteredMessages.length} />
        )}
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-custom"
      >
        {!buttonLoading && messages?.length > 0 && !hasMore && (
          <div className="flex justify-center pb-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest bg-white/5 rounded-full px-3 py-1">
              Beginning of conversation
            </div>
          </div>
        )}

        {loadingOlder && (
          <div className="flex justify-center pb-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {buttonLoading && messages?.length === 0 ? (
          <div className="space-y-4 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} gap-3 animate-fade-in`}>
                {i % 2 !== 0 && <div className="w-8 h-8 rounded-full skeleton flex-shrink-0" />}
                <div className={`space-y-2 ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
                  <div className={`h-10 skeleton rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
                  <div className="h-3 w-16 skeleton rounded" />
                </div>
                {i % 2 === 0 && <div className="w-8 h-8 rounded-full skeleton flex-shrink-0" />}
              </div>
            ))}
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <BsChatDots className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm font-medium">No messages yet</p>
              <p className="text-gray-600 text-xs mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : filteredMessages?.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">No messages match your search</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedMessages.map((item, index) => {
              if (item.type === 'date') {
                return <DateSeparator key={`date-${index}`} date={item.date} />;
              }
              const msg = item.message;
              return (
                <div
                  key={msg._id || index}
                  id={`message-${msg._id}`}
                >
                  <Message
                    messageDetails={msg}
                    onReply={handleReply}
                    onStartEdit={handleStartEdit}
                    onScrollToMessage={scrollToMessage}
                    searchQuery={searchQuery}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        <TypingIndicator userId={selectedUser?._id} />
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-10 hover:scale-105"
            aria-label="Close preview"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <SendMessage
        replyTo={replyTo}
        onCancelReply={cancelReply}
        editingMessage={editingMessage}
        onCancelEdit={cancelEdit}
      />
    </div>
  )
}

export default MessageContainer
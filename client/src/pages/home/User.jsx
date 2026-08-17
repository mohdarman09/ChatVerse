import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setSelectedUser } from "../../store/slice/user/user.slice";
import Avatar from "../../components/Avatar";

function User({ userDetails, onClick, lastMessage, unreadCount, isMobile }) {

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedUser } = useSelector(state => state.userReducer);
  const { onlineUsers } = useSelector(state => state.socketReducer);
  const isUserOnline = onlineUsers?.includes(userDetails?._id);
  const isSelected = userDetails?._id === selectedUser?._id;

  const handleUserClick = () => {
    dispatch(setSelectedUser(userDetails));
    if (onClick) onClick();
  };

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (userDetails?._id) {
      navigate(`/profile/${userDetails._id}`);
    }
  };

  const formatMessageTime = () => {
    if (!lastMessage?.createdAt) return '';
    const date = new Date(lastMessage.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Mobile layout: compact user row with well-proportioned avatar
  if (isMobile) {
    return (
      <div
        onClick={handleUserClick}
        className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors duration-150 border-b border-[var(--border-subtle)]
          ${isSelected ? 'bg-primary/[0.08]' : 'hover:bg-[var(--user-hover-bg)] active:bg-[var(--btn-secondary-hover)]'}
        `}
      >
        <div
          className="relative flex-shrink-0"
          onClick={handleAvatarClick}
          title="View profile"
        >
          <div className="w-12 h-12 rounded-full overflow-hidden ring-1 ring-[var(--border-color)] active:scale-95 transition-transform">
            <Avatar
              src={userDetails?.avatar}
              name={userDetails?.fullName}
              seed={userDetails?.username}
              className="w-full h-full"
            />
          </div>
          {isUserOnline && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-primary)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium text-[var(--text-primary)] truncate">{userDetails?.fullName}</h2>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {lastMessage?.createdAt && (
                <span className="text-[11px] font-normal text-[var(--text-muted)]">{formatMessageTime()}</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="flex-1 text-xs font-normal text-[var(--text-secondary)] truncate pr-2">
              {lastMessage ? (
                <span>
                  {lastMessage.messageType === 'image' ? '📷 Image' : lastMessage.message}
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">@{userDetails?.username}</span>
              )}
            </p>
            {unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-[10px] font-medium text-white px-1 shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout: compact and balanced
  return (
    <div
      onClick={handleUserClick}
      className={`group flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors duration-150 animate-fade-in relative
        ${isSelected
          ? 'bg-primary/10 border border-primary/20 shadow-sm'
          : 'hover:bg-[var(--user-hover-bg)] border border-transparent'
        }`}
    >
      <div
        className="relative flex-shrink-0"
        onClick={handleAvatarClick}
        title="View profile"
      >
        <div className={`w-10 h-10 rounded-full overflow-hidden ring-1 transition-all duration-200 hover:scale-105 active:scale-95
          ${isSelected ? 'ring-primary/60' : 'ring-[var(--border-color)] group-hover:ring-primary/40'}`}>
          <Avatar
            src={userDetails?.avatar}
            name={userDetails?.fullName}
            seed={userDetails?.username}
            className="w-full h-full"
          />
        </div>
        {isUserOnline && (
          <div className="absolute -top-0.5 -right-0.5 status-dot status-dot-online" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-[var(--text-primary)] truncate">{userDetails?.fullName}</h2>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {lastMessage?.createdAt && (
              <span className="text-[10px] font-normal text-[var(--text-muted)]">{formatMessageTime()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="flex-1 text-xs font-normal text-[var(--text-secondary)] truncate">
            {lastMessage ? (
              <span>
                {lastMessage.messageType === 'image' ? '📷 Image' : lastMessage.message}
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">@{userDetails?.username}</span>
            )}
          </p>
          {unreadCount > 0 && (
            <span className="ml-2 flex-shrink-0 min-w-[18px] h-4 flex items-center justify-center rounded-full bg-primary text-[10px] font-medium text-white px-1 shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {isUserOnline && !unreadCount && (
            <span className="text-[10px] text-green-500 flex-shrink-0 ml-2 font-normal">Online</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default User;
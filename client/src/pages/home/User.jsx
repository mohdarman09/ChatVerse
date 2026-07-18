import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser } from "../../store/slice/user/user.slice";

function User({ userDetails, onClick, lastMessage, unreadCount }) {

  const dispatch = useDispatch();
  const { selectedUser } = useSelector(state => state.userReducer);
  const { onlineUsers } = useSelector(state => state.socketReducer);
  const { lastSeenMap } = useSelector(state => state.userReducer);
  const isUserOnline = onlineUsers?.includes(userDetails?._id);
  const isSelected = userDetails?._id === selectedUser?._id;

  const handleUserClick = () => {
    dispatch(setSelectedUser(userDetails));
    if (onClick) onClick();
  }

  const formatLastSeen = () => {
    const lastSeen = lastSeenMap[userDetails?._id] || userDetails?.lastSeen;
    if (!lastSeen || isUserOnline) return null;
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 2) return "yesterday";
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

  const lastSeenText = formatLastSeen();

  return (
    <div
      onClick={handleUserClick}
      className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 animate-fade-in relative
        ${isSelected
          ? 'bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5'
          : 'hover:bg-white/5 border border-transparent'
        }`}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-12 h-12 rounded-full overflow-hidden ring-2 transition-all duration-300
          ${isSelected ? 'ring-primary' : 'ring-white/10 group-hover:ring-primary/50'}`}>
          <img
            src={userDetails?.avatar}
            alt={userDetails?.fullName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${userDetails?.fullName}&background=6366F1&color=fff`;
            }}
          />
        </div>
        {isUserOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0F172A] animate-pulse" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-white truncate">{userDetails?.fullName}</h2>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {lastMessage?.createdAt && (
              <span className="text-[10px] text-gray-600">{formatMessageTime()}</span>
            )}
            {(isUserOnline || lastSeenText) && !isUserOnline && (
              <span className="text-[10px] text-gray-600">{lastSeenText}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-gray-500 truncate flex-1">
            {lastMessage ? (
              <span className="text-gray-500">
                {lastMessage.message}
              </span>
            ) : (
              <span className="text-gray-600">@{userDetails?.username}</span>
            )}
          </p>
          {unreadCount > 0 && (
            <span className="ml-2 flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {isUserOnline && !unreadCount && (
            <span className="text-[10px] text-green-500/70 flex-shrink-0 ml-2">Online</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default User;

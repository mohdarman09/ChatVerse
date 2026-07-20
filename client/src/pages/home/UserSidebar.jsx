import React, { useEffect, useMemo } from "react";
import { IoSearch, IoLogOut, IoSettingsOutline } from "react-icons/io5";
import { RiMessage2Fill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import User from "./User";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { logoutUserThunk } from "../../store/slice/user/user.thunk";
import { getConversationsThunk } from "../../store/slice/message/message.thunk";

function UserSidebar({ onSelectUser }) {

  const [searchValue, setSearchValue] = React.useState("");
  const [users, setUsers] = React.useState([]);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { otherUsers, userProfile } = useSelector(state => state.userReducer);
  const { conversations, unreadCounts } = useSelector(state => state.messageReducer);

  useEffect(() => {
    dispatch(getConversationsThunk());
  }, []);

  const conversationMap = useMemo(() => {
    const map = {};
    conversations?.forEach(c => {
      if (c.otherUser) {
        map[c.otherUser._id] = c;
      }
    });
    return map;
  }, [conversations]);

  const sortedUsers = useMemo(() => {
    if (!otherUsers) return [];
    const sorted = [...otherUsers].sort((a, b) => {
      const convA = conversationMap[a._id];
      const convB = conversationMap[b._id];
      const timeA = convA?.lastMessage?.createdAt ? new Date(convA.lastMessage.createdAt).getTime() : 0;
      const timeB = convB?.lastMessage?.createdAt ? new Date(convB.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    return sorted;
  }, [otherUsers, conversationMap]);

  const handleLogout = async () => {
    await dispatch(logoutUserThunk());
    toast.success("Logout successful");
  }

  useEffect(() => {
    if (!searchValue) {
      setUsers(sortedUsers);
    }
    else {
      const filteredUsers = sortedUsers?.filter((user) => {
        return user.fullName.toLowerCase().includes(searchValue.toLowerCase()) || user.username.toLowerCase().includes(searchValue.toLowerCase());
      });
      setUsers(filteredUsers);
    }
  }, [searchValue, sortedUsers])

  return (
    <div className="w-full h-full flex flex-col glass border-r border-white/5">
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl gradient-primary shadow-lg shadow-primary/25">
            <RiMessage2Fill className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold gradient-text">ChatVerse</h1>
        </div>

        <div className="relative group">
          <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
          <input
            onChange={(e) => setSearchValue(e.target.value)}
            value={searchValue}
            type="search"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-300"
            placeholder="Search conversations..."
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-custom">
        {users?.map((userDetails) => {
          const conv = conversationMap[userDetails._id];
          const unread = unreadCounts[userDetails._id] ?? conv?.unreadCount ?? 0;
          return (
            <User
              key={userDetails._id}
              userDetails={userDetails}
              onClick={onSelectUser}
              lastMessage={conv?.lastMessage}
              unreadCount={unread}
            />
          )
        })}
        {users?.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8 animate-fade-in">
            No conversations found
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-all duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30">
                <img
                  src={userProfile?.profile?.avatar}
                  alt={userProfile?.profile?.fullName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${userProfile?.profile?.fullName}&background=6366F1&color=fff`;
                  }}
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 status-dot status-dot-online" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-white truncate">{userProfile?.profile?.fullName}</h2>
              <p className="text-[11px] text-green-400/80">Online</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/10 transition-all duration-300 flex-shrink-0"
            title="Profile Settings"
          >
            <IoSettingsOutline className="w-5 h-5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 flex-shrink-0"
            title="Logout"
          >
            <IoLogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div >
  );
}

export default UserSidebar;

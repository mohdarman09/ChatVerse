import { useEffect, useMemo, useState } from "react";
import { IoSearch, IoLogOut, IoSettingsOutline } from "react-icons/io5";
import { RiMessage2Fill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import User from "./User";
import Avatar from "../../components/Avatar";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { logoutUserThunk, searchUsersThunk } from "../../store/slice/user/user.thunk";
import { getConversationsThunk } from "../../store/slice/message/message.thunk";

const EmptyState = ({ isMobile }) => (
  <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center animate-fade-in">
    <div className="relative mb-6">
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150" aria-hidden="true" />
      <div className="relative w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
        <RiMessage2Fill className={`text-primary ${isMobile ? 'w-9 h-9' : 'w-8 h-8'}`} />
      </div>
      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary/40 blur-sm" aria-hidden="true" />
    </div>
    <h3 className="text-lg font-bold text-white">Start a conversation</h3>
    <p className="text-sm text-gray-500 mt-1.5 max-w-[240px] leading-relaxed">
      Search for someone and send your first message.
    </p>
    <p className="text-xs text-gray-600 mt-3">Your recent conversations will appear here.</p>
  </div>
);

function UserSidebar({ onSelectUser, isMobile }) {

  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userProfile } = useSelector(state => state.userReducer);
  const { conversations, unreadCounts } = useSelector(state => state.messageReducer);

  useEffect(() => {
    dispatch(getConversationsThunk());
  }, []);

  const isSearching = searchValue.trim().length > 0;

  useEffect(() => {
    const trimmed = searchValue.trim();
    if (!trimmed) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await dispatch(searchUsersThunk(trimmed));
        if (res?.payload?.responseData) {
          setSearchResults(res.payload.responseData);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, dispatch]);

  const sortedConversations = useMemo(() => {
    if (!isSearching) {
      return [...(conversations || [])].sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );
    }
    const q = searchValue.trim().toLowerCase();
    return (conversations || [])
      .filter(c => {
        const name = (c.otherUser?.fullName || "").toLowerCase();
        const uname = (c.otherUser?.username || "").toLowerCase();
        return name.includes(q) || uname.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [conversations, isSearching, searchValue]);

  const searchResultsUsers = useMemo(() => {
    if (!isSearching || !searchResults?.length) return [];
    const conversationIds = new Set(
      (conversations || []).map(c => String(c.otherUser?._id)).filter(Boolean)
    );
    return searchResults.filter(u => !conversationIds.has(String(u._id)));
  }, [isSearching, searchResults, conversations]);

  const showEmptyState = !isSearching && sortedConversations.length === 0;
  const showNoResults = isSearching && !searching && sortedConversations.length === 0 && searchResultsUsers.length === 0;

  const handleLogout = async () => {
    setLogoutLoading(true);
    await dispatch(logoutUserThunk());
    setLogoutLoading(false);
    setShowLogoutModal(false);
    toast.success("Logout successful");
  }

  const logoutModal = showLogoutModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !logoutLoading && setShowLogoutModal(false)}
      />
      <div className="relative glass-card p-6 w-full max-w-sm animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <IoLogOut className="w-6 h-6 text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">Logout</h2>
            <p className="text-sm text-gray-400 mt-0.5">Are you sure you want to logout?</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowLogoutModal(false)}
            disabled={logoutLoading}
            className="glossy-btn glossy-btn-secondary flex-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="glossy-btn glossy-btn-danger flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {logoutLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Logout"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const conversationRows = sortedConversations.map((conv) => {
    const otherUser = conv?.otherUser;
    if (!otherUser) return null;
    const unread = unreadCounts[otherUser._id] ?? conv?.unreadCount ?? 0;
    return (
      <User
        key={otherUser._id}
        isMobile={isMobile}
        userDetails={otherUser}
        onClick={onSelectUser}
        lastMessage={conv?.lastMessage}
        unreadCount={unread}
      />
    );
  });

  const searchResultRows = searchResultsUsers.map((user) => (
    <User
      key={user._id}
      isMobile={isMobile}
      userDetails={user}
      onClick={onSelectUser}
    />
  ));

  const profileSection = (
    <div className="flex items-center gap-2.5">
      <div className="relative flex-shrink-0">
        <div className="overflow-hidden rounded-full w-11 h-11 ring-2 ring-primary/30">
          <Avatar
            src={userProfile?.profile?.avatar}
            name={userProfile?.profile?.fullName}
            seed={userProfile?.profile?.username}
            className="w-full h-full"
          />
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--bg-secondary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-medium text-white truncate">{userProfile?.profile?.fullName}</h2>
        <p className="text-[11px] text-green-400/80 truncate">Online</p>
      </div>
      <div className="flex items-center flex-shrink-0 gap-0.5">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center justify-center text-gray-400 transition-all w-10 h-10 rounded-xl hover:text-primary hover:bg-white/5"
          title="Profile Settings"
          aria-label="Profile Settings"
        >
          <IoSettingsOutline className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center justify-center text-gray-400 transition-all w-10 h-10 rounded-xl hover:text-red-400 hover:bg-red-500/10"
          title="Logout"
          aria-label="Logout"
        >
          <IoLogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const searchBar = (
    <div className="relative group">
      <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
      <input
        onChange={(e) => setSearchValue(e.target.value)}
        value={searchValue}
        type="search"
        className="w-full py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 transition-all border bg-white/5 border-white/10 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
        placeholder="Search or start a new chat"
      />
    </div>
  );

  const listContent = showEmptyState ? (
    <EmptyState isMobile={isMobile} />
  ) : showNoResults ? (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
        <IoSearch className="w-6 h-6 text-gray-600" />
      </div>
      <h3 className="text-base font-semibold text-white">No users found</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-[240px] leading-relaxed">
        No one matches "{searchValue.trim()}".
      </p>
    </div>
  ) : (
    <>
      {conversationRows}
      {isSearching && searchResultsUsers.length > 0 && (
        <p className={`text-[11px] font-medium text-gray-500 uppercase tracking-wider ${isMobile ? 'px-4 pt-3 pb-1' : 'px-3 pt-3 pb-1'}`}>
          Search results
        </p>
      )}
      {searchResultRows}
      {isSearching && searching && conversationRows.length === 0 && searchResultsUsers.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-white/15 border-t-primary rounded-full animate-spin" />
        </div>
      )}
    </>
  );

  // Mobile layout: full-screen conversation list
  if (isMobile) {
    return (
      <>
        <div className="w-full h-dvh flex flex-col bg-[var(--bg-primary)]">
          {/* Top section - fixed */}
          <div className="flex-shrink-0 safe-top-mobile">
            <div className="flex items-center gap-3 px-4 pt-3 pb-1 border-b border-white/[0.06]">
              <div className="p-1.5 rounded-xl gradient-primary flex-shrink-0">
                <RiMessage2Fill className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold gradient-text">ChatVerse</h1>
            </div>

            <div className="px-4 pt-2 pb-3">
              {searchBar}
            </div>
          </div>

          {/* Middle section - scrollable, fills remaining space */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
            {listContent}
          </div>

          {/* Bottom section - fixed at very bottom */}
          <div className="flex-shrink-0 border-t border-white/[0.06] bg-[var(--bg-secondary)] px-3 py-2.5 safe-bottom-mobile">
            {profileSection}
          </div>
        </div>
        {logoutModal}
      </>
    );
  }

  // Desktop layout
  return (
    <>
      <div className="flex flex-col w-full h-full border-r glass border-white/5">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 shadow-lg rounded-xl gradient-primary shadow-primary/25 flex-shrink-0">
              <RiMessage2Fill className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold gradient-text">ChatVerse</h1>
          </div>

          {searchBar}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-custom min-h-0 flex flex-col">
          {listContent}
        </div>

        <div className="px-3 py-2.5 border-t border-white/5">
          <div className="rounded-xl p-2 transition-all duration-300 hover:bg-white/5">
            {profileSection}
          </div>
        </div>
      </div>
      {logoutModal}
    </>
  );
}

export default UserSidebar;
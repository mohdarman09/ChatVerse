import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IoArrowBack, IoBan, IoCheckmarkCircleOutline, IoChatbubbleEllipsesOutline, IoAlertCircleOutline } from 'react-icons/io5';
import { RiMessage2Fill, RiCalendarLine } from 'react-icons/ri';
import { FaVenusMars } from 'react-icons/fa';
import Avatar from '../../components/Avatar';
import { getUserByIdThunk, blockUserThunk, unblockUserThunk } from '../../store/slice/user/user.thunk';
import { setSelectedUser } from '../../store/slice/user/user.slice';

function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userProfile } = useSelector((state) => state.userReducer);
  const { onlineUsers } = useSelector((state) => state.socketReducer);

  const currentUserId = userProfile?.profile?._id;
  const isOwnProfile = currentUserId && String(currentUserId) === String(userId);

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const isUserOnline = onlineUsers?.includes(userId);

  const fetchUserProfile = useCallback(async () => {
    if (!userId) {
      setError({ message: "Invalid user ID", status: 400 });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await dispatch(getUserByIdThunk({ userId }));
      if (res?.payload?.success && res.payload.responseData) {
        setProfileData(res.payload.responseData);
      } else {
        const payload = res?.payload;
        if (payload && typeof payload === 'object') {
          setError(payload);
        } else {
          setError({ message: payload || "User not found", status: 404 });
        }
      }
    } catch {
      setError({ message: "Unable to load profile. Please try again.", status: 500 });
    } finally {
      setLoading(false);
    }
  }, [userId, dispatch]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleStartChat = () => {
    if (!profileData?.user) return;
    dispatch(setSelectedUser(profileData.user));
    navigate('/');
  };

  const handleToggleBlock = async () => {
    if (actionLoading || !userId) return;
    setActionLoading(true);
    setShowBlockModal(false);

    try {
      if (profileData?.isBlocked) {
        const res = await dispatch(unblockUserThunk({ userId }));
        if (res?.payload?.success) {
          setProfileData((prev) => prev ? { ...prev, isBlocked: false, canMessage: !prev.isBlockedByOther } : null);
        }
      } else {
        const res = await dispatch(blockUserThunk({ userId }));
        if (res?.payload?.success) {
          setProfileData((prev) => prev ? { ...prev, isBlocked: true, canMessage: false } : null);
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-9 h-9 border-2 rounded-full border-primary/30 border-t-primary animate-spin" />
          <span className="text-sm text-gray-500">Loading user profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profileData?.user) {
    const errorStatus = error?.status;
    const errorTitle = errorStatus === 400
      ? "Invalid User Profile"
      : errorStatus === 404
        ? "User Not Found"
        : "Unable to Load Profile";

    const errorMessage = error?.message || (typeof error === 'string' ? error : "The requested user profile does not exist or has been deleted.");

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
        <div className="glass-card p-6 sm:p-8 max-w-sm w-full text-center space-y-4 animate-scale-in">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            {errorStatus === 400 || errorStatus === 404 ? (
              <IoBan className="w-7 h-7" />
            ) : (
              <IoAlertCircleOutline className="w-7 h-7" />
            )}
          </div>
          <h2 className="text-lg font-bold text-white">{errorTitle}</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={handleBack}
            className="glossy-btn w-full flex items-center justify-center gap-2 mt-4"
          >
            <IoArrowBack className="w-4 h-4" />
            Back to Chats
          </button>
        </div>
      </div>
    );
  }

  const targetUser = profileData.user;
  const isBlocked = profileData.isBlocked;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-[540px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in flex-1">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="p-2.5 text-gray-400 transition-all duration-300 rounded-xl hover:bg-white/5 hover:text-white"
            aria-label="Go Back"
          >
            <IoArrowBack className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 shadow-lg rounded-xl gradient-primary shadow-primary/20">
              <RiMessage2Fill className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold gradient-text">User Profile</h1>
          </div>
          <div className="w-10" />
        </div>

        {/* Profile Card */}
        <div className="rounded-[24px] glass-card p-6 sm:p-8 space-y-6 shadow-2xl border border-white/10">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-[3px] ring-primary/40 ring-offset-[3px] ring-offset-[var(--bg-primary)] shadow-2xl shadow-primary/20">
                <Avatar
                  src={targetUser.avatar}
                  name={targetUser.fullName}
                  seed={targetUser.username}
                  className="w-full h-full object-cover"
                />
              </div>
              {isUserOnline && (
                <div
                  className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-[var(--bg-primary)] shadow-md"
                  title="Online"
                />
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">{targetUser.fullName}</h2>
              <p className="text-sm font-medium text-primary/90">@{targetUser.username}</p>
            </div>

            {/* Online Status Badge */}
            <div className="pt-1">
              {isUserOnline ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Online Now
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-gray-500" />
                  Offline
                </span>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="pt-4 border-t border-white/[0.06] space-y-3">
            {targetUser.gender && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FaVenusMars className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">Gender</span>
                </div>
                <span className="text-xs font-semibold text-white/90 capitalize">
                  {targetUser.gender}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <RiCalendarLine className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-400">Member Since</span>
              </div>
              <span className="text-xs font-semibold text-white/90">
                {formatJoinDate(targetUser.createdAt)}
              </span>
            </div>
          </div>

          {/* Block Status Warning if Blocked */}
          {isBlocked && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-fade-in">
              <IoBan className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-300 leading-relaxed">
                You have blocked this user. They cannot message you or call you.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-3">
            {isOwnProfile ? (
              <button
                onClick={() => navigate('/profile')}
                className="glossy-btn w-full flex items-center justify-center gap-2 text-sm font-semibold h-11"
              >
                Edit My Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleStartChat}
                  disabled={isBlocked}
                  className="glossy-btn w-full flex items-center justify-center gap-2 text-sm font-semibold h-11 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <IoChatbubbleEllipsesOutline className="w-5 h-5" />
                  Send Message
                </button>

                {isBlocked ? (
                  <button
                    onClick={handleToggleBlock}
                    disabled={actionLoading}
                    className="w-full h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <IoCheckmarkCircleOutline className="w-5 h-5 text-green-400" />
                        Unblock User
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowBlockModal(true)}
                    disabled={actionLoading}
                    className="w-full h-11 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <IoBan className="w-4 h-4" />
                    Block User
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Block Confirmation Modal */}
      {showBlockModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setShowBlockModal(false)}
        >
          <div
            className="rounded-[20px] glass-card p-6 sm:p-7 max-w-sm w-full space-y-4 animate-scale-in border border-red-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <IoBan className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Block {targetUser.fullName}?</h3>
            </div>
            <p className="text-xs leading-relaxed text-gray-400">
              Blocked users cannot send you messages or start audio calls. You can unblock them at any time from their profile.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowBlockModal(false)}
                disabled={actionLoading}
                className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-medium hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleBlock}
                disabled={actionLoading}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Confirm Block'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;

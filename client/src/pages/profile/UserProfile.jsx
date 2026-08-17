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
        <div className="flex flex-col items-center gap-2.5 animate-fade-in">
          <div className="w-7 h-7 border-2 rounded-full border-primary/30 border-t-primary animate-spin" />
          <span className="text-xs font-normal text-[var(--text-secondary)]">Loading user profile...</span>
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
        <div className="glass-card p-5 sm:p-6 max-w-xs w-full text-center space-y-3.5 animate-scale-in border border-[var(--border-color)]">
          <div className="w-12 h-12 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] flex items-center justify-center mx-auto text-[var(--danger-text)]">
            {errorStatus === 400 || errorStatus === 404 ? (
              <IoBan className="w-6 h-6" />
            ) : (
              <IoAlertCircleOutline className="w-6 h-6" />
            )}
          </div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{errorTitle}</h2>
          <p className="text-xs font-normal text-[var(--text-secondary)] leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={handleBack}
            className="glossy-btn w-full flex items-center justify-center gap-1.5 h-9 text-xs font-medium mt-3"
          >
            <IoArrowBack className="w-3.5 h-3.5" />
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

      <div className="relative max-w-[500px] w-full mx-auto px-4 sm:px-6 safe-top-page pb-10 animate-fade-in flex-1">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={handleBack}
            className="p-2 text-[var(--text-secondary)] transition-colors duration-150 rounded-lg hover:bg-[var(--btn-secondary-bg)] hover:text-[var(--text-primary)]"
            aria-label="Go Back"
          >
            <IoArrowBack className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 shadow-sm rounded-lg gradient-primary flex-shrink-0">
              <RiMessage2Fill className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-semibold gradient-text">User Profile</h1>
          </div>
          <div className="w-9" />
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl glass-card p-5 sm:p-6 space-y-4 shadow-sm border border-[var(--border-color)]">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="relative">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-[var(--bg-primary)] shadow-sm">
                <Avatar
                  src={targetUser.avatar}
                  name={targetUser.fullName}
                  seed={targetUser.username}
                  className="w-full h-full object-cover"
                />
              </div>
              {isUserOnline && (
                <div
                  className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[var(--bg-primary)] shadow-sm"
                  title="Online"
                />
              )}
            </div>

            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">{targetUser.fullName}</h2>
              <p className="text-xs font-normal text-primary">@{targetUser.username}</p>
            </div>

            {/* Online Status Badge */}
            <div className="pt-0.5">
              {isUserOnline ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-green-500/10 text-green-500 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Online Now
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-[var(--status-badge-offline-bg)] text-[var(--status-badge-offline-text)] border border-[var(--status-badge-offline-border)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                  Offline
                </span>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            {targetUser.gender && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FaVenusMars className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-normal text-[var(--text-secondary)]">Gender</span>
                </div>
                <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                  {targetUser.gender}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <RiCalendarLine className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-normal text-[var(--text-secondary)]">Member Since</span>
              </div>
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {formatJoinDate(targetUser.createdAt)}
              </span>
            </div>
          </div>

          {/* Block Status Warning if Blocked */}
          {isBlocked && (
            <div className="p-3 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] flex items-center gap-2.5 animate-fade-in">
              <IoBan className="w-4 h-4 text-[var(--danger-text)] flex-shrink-0" />
              <p className="text-xs text-[var(--danger-text)] font-normal leading-relaxed">
                You have blocked this user. They cannot message you or call you.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-1 space-y-2">
            {isOwnProfile ? (
              <button
                onClick={() => navigate('/profile')}
                className="glossy-btn w-full flex items-center justify-center gap-1.5 text-xs font-medium h-9"
              >
                Edit My Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleStartChat}
                  disabled={isBlocked}
                  className="glossy-btn w-full flex items-center justify-center gap-1.5 text-xs font-medium h-9 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <IoChatbubbleEllipsesOutline className="w-4 h-4" />
                  Send Message
                </button>

                {isBlocked ? (
                  <button
                    onClick={handleToggleBlock}
                    disabled={actionLoading}
                    className="w-full h-9 rounded-xl bg-[var(--btn-secondary-bg)] border border-[var(--btn-secondary-border)] hover:bg-[var(--btn-secondary-hover)] active:scale-[0.98] text-[var(--text-primary)] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        <IoCheckmarkCircleOutline className="w-4 h-4 text-green-500" />
                        Unblock User
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowBlockModal(true)}
                    disabled={actionLoading}
                    className="w-full h-9 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] hover:bg-[var(--danger-hover)] text-[var(--danger-text)] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] disabled:opacity-50"
                  >
                    <IoBan className="w-3.5 h-3.5" />
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
            className="rounded-2xl glass-card p-5 sm:p-6 max-w-xs w-full space-y-3.5 animate-scale-in border border-[var(--danger-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-[var(--danger-text)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--danger-bg)] flex items-center justify-center flex-shrink-0">
                <IoBan className="w-4 h-4 text-[var(--danger-text)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Block {targetUser.fullName}?</h3>
            </div>
            <p className="text-xs font-normal leading-relaxed text-[var(--text-secondary)]">
              Blocked users cannot send you messages or start audio calls. You can unblock them at any time from their profile.
            </p>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowBlockModal(false)}
                disabled={actionLoading}
                className="flex-1 h-9 rounded-lg bg-[var(--btn-secondary-bg)] border border-[var(--btn-secondary-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--btn-secondary-hover)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleBlock}
                disabled={actionLoading}
                className="flex-1 h-9 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-md shadow-red-500/25 flex items-center justify-center gap-1"
              >
                {actionLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

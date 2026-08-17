import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  IoArrowBack,
  IoCamera,
  IoTrashOutline,
  IoKeySharp,
  IoColorPalette,
  IoSunny,
  IoMoon,
  IoCheckmark,
  IoShieldCheckmarkOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { RiMessage2Fill, RiCalendarLine, RiEdit2Line } from 'react-icons/ri';
import {
  getUserProfileThunk,
  updateProfileThunk,
  changePasswordThunk,
  deleteAccountThunk
} from '../../store/slice/user/user.thunk';
import { useTheme } from '../../context/ThemeContext';

function Profile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userProfile, buttonLoading } = useSelector((state) => state.userReducer);
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswordFields, setShowPasswordFields] = useState({ current: false, new: false, confirm: false });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!userProfile?.profile?._id) {
      dispatch(getUserProfileThunk()).finally(() => setInitialLoading(false));
    } else {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userProfile?.profile) {
      setFullName(userProfile.profile.fullName || '');
      setUsername(userProfile.profile.username || '');
    }
  }, [userProfile]);

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only .jpg, .jpeg, .png, and .webp files are allowed');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5 MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }

    setSelectedAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarRemoved(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [avatarPreview]);

  const removeAvatar = useCallback(() => {
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setSelectedAvatar(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
  }, [avatarPreview]);

  const currentAvatar = !avatarRemoved && (avatarPreview || userProfile?.profile?.avatar);

  const getInitialsAvatar = () => {
    const name = userProfile?.profile?.fullName || 'User';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const handleSaveInfo = async () => {
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();

    if (!trimmedName) {
      return toast.error('Full name is required');
    }
    if (!trimmedUsername) {
      return toast.error('Username is required');
    }
    if (trimmedUsername.length < 3) {
      return toast.error('Username must be at least 3 characters');
    }

    const response = await dispatch(updateProfileThunk({
      fullName: trimmedName,
      username: trimmedUsername,
      avatar: selectedAvatar || undefined,
      removeAvatar: avatarRemoved
    }));

    if (response?.payload?.success) {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      setSelectedAvatar(null);
      setAvatarPreview(null);
      setAvatarRemoved(false);
      setIsEditingInfo(false);
    }
  };

  const handlePasswordInputChange = (e) => {
    setPasswordForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const togglePasswordField = (field) => {
    setShowPasswordFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error('All fields are required');
    }
    if (newPassword.length < 8) {
      return toast.error('New password must be at least 8 characters');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('New password and confirm password do not match');
    }

    setPasswordLoading(true);
    const response = await dispatch(changePasswordThunk({ currentPassword, newPassword, confirmPassword }));
    setPasswordLoading(false);

    if (response?.payload?.success) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const response = await dispatch(deleteAccountThunk());
    setDeleting(false);
    setShowDeleteModal(false);

    if (response?.payload?.success) {
      toast.success('Account deleted successfully');
      navigate('/login', { replace: true });
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
        <div className="flex flex-col items-center gap-2.5 animate-fade-in">
          <div className="w-7 h-7 border-2 rounded-full border-primary/30 border-t-primary animate-spin" />
          <span className="text-xs font-normal text-[var(--text-secondary)]">Loading settings...</span>
        </div>
      </div>
    );
  }

  const hasAvatarChanges = selectedAvatar !== null || avatarRemoved;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-[580px] w-full mx-auto px-4 sm:px-6 safe-top-page pb-10 animate-fade-in flex-1">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={handleBack}
            className="p-2 text-[var(--text-secondary)] transition-colors duration-150 rounded-lg hover:bg-[var(--btn-secondary-bg)] hover:text-[var(--text-primary)]"
            aria-label="Back to chats"
          >
            <IoArrowBack className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 shadow-sm rounded-lg gradient-primary flex-shrink-0">
              <RiMessage2Fill className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold gradient-text">Settings</h1>
            </div>
          </div>
          <div className="w-9" />
        </div>

        <div className="space-y-4">
          {/* SECTION 1: ACCOUNT HERO CARD */}
          <div className="rounded-2xl glass-card p-4 sm:p-5 shadow-sm border border-[var(--border-color)] relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Avatar with Camera Button */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-[var(--bg-primary)] shadow-sm">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt="Profile"
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ${currentAvatar ? 'hidden' : ''}`}
                  >
                    <span className="text-xl font-medium text-white/90">
                      {getInitialsAvatar()}
                    </span>
                  </div>
                </div>

                {/* Floating Avatar Actions */}
                <div className="absolute -bottom-0.5 -right-0.5 flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-white transition-transform duration-150 rounded-full shadow-md bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95"
                    aria-label="Upload photo"
                    title="Change profile photo"
                  >
                    <IoCamera className="w-3 h-3" />
                  </button>
                  {currentAvatar && (
                    <button
                      onClick={removeAvatar}
                      className="p-1.5 text-white transition-transform duration-150 bg-red-500 rounded-full shadow-md hover:bg-red-600 hover:scale-105 active:scale-95"
                      aria-label="Remove photo"
                      title="Remove profile photo"
                    >
                      <IoTrashOutline className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </div>

              {/* User Details & Edit Trigger */}
              <div className="flex-1 text-center sm:text-left min-w-0 space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight truncate">
                      {userProfile?.profile?.fullName || 'ChatVerse User'}
                    </h2>
                    <p className="text-xs font-normal text-primary">
                      @{userProfile?.profile?.username || 'username'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditingInfo(!isEditingInfo)}
                    className="self-center sm:self-start px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <RiEdit2Line className="w-3 h-3" />
                    {isEditingInfo ? 'Close Edit' : 'Edit Profile'}
                  </button>
                </div>

                <div className="pt-1 flex items-center justify-center sm:justify-start gap-1.5 text-[11px] font-normal text-[var(--text-muted)]">
                  <RiCalendarLine className="w-3.5 h-3.5 text-primary" />
                  <span>Joined {formatDate(userProfile?.profile?.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Editable Profile Inputs (Collapsible) */}
            {(isEditingInfo || hasAvatarChanges) && (
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-glass px-3 py-2 text-xs h-9 rounded-lg"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-glass px-3 py-2 text-xs h-9 rounded-lg"
                      placeholder="Username"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveInfo}
                  disabled={buttonLoading}
                  className="glossy-btn w-full flex items-center justify-center gap-1.5 text-xs font-medium h-9 rounded-lg mt-1"
                >
                  {buttonLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    'Save Profile Details'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: APPEARANCE & THEME */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <IoColorPalette className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">Appearance</h3>
            </div>

            <div className="rounded-2xl glass-card p-3.5 sm:p-4 border border-[var(--border-color)]">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between h-24 relative ${
                    theme === 'dark'
                      ? 'bg-primary/10 border-primary ring-1 ring-primary/40 shadow-sm'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-color)] hover:bg-[var(--btn-secondary-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-7 h-7 rounded-lg bg-[#0a0a0f] border border-white/10 flex items-center justify-center text-indigo-400 shadow-inner">
                      <IoMoon className="w-3.5 h-3.5" />
                    </div>
                    {theme === 'dark' && (
                      <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                        <IoCheckmark className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">Dark Mode</h4>
                    <p className="text-[10px] font-normal text-[var(--text-muted)] mt-0.5">Sleek dark interface</p>
                  </div>
                </button>

                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between h-24 relative ${
                    theme === 'light'
                      ? 'bg-primary/10 border-primary ring-1 ring-primary/40 shadow-sm'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-color)] hover:bg-[var(--btn-secondary-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
                      <IoSunny className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    {theme === 'light' && (
                      <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
                        <IoCheckmark className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">Light Mode</h4>
                    <p className="text-[10px] font-normal text-[var(--text-muted)] mt-0.5">Bright clean interface</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3: SECURITY / CHANGE PASSWORD */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <IoShieldCheckmarkOutline className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">Security</h3>
            </div>

            <div className="rounded-2xl glass-card p-4 sm:p-5 border border-[var(--border-color)] space-y-3.5">
              {/* Header */}
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-[var(--border-subtle)]">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <IoKeySharp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">Change Password</h4>
                  <p className="text-[11px] font-normal text-[var(--text-muted)] mt-0.5">Update your account password securely</p>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswordFields.current ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordInputChange}
                      className="input-glass px-3 pr-9 py-2 text-xs h-9 rounded-lg"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordField('current')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPasswordFields.current ? <FaEyeSlash className="w-3.5 h-3.5" /> : <FaEye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswordFields.new ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordInputChange}
                        className="input-glass px-3 pr-9 py-2 text-xs h-9 rounded-lg"
                        placeholder="Min 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordField('new')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showPasswordFields.new ? <FaEyeSlash className="w-3.5 h-3.5" /> : <FaEye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showPasswordFields.confirm ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordInputChange}
                        className="input-glass px-3 pr-9 py-2 text-xs h-9 rounded-lg"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordField('confirm')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showPasswordFields.confirm ? <FaEyeSlash className="w-3.5 h-3.5" /> : <FaEye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="glossy-btn w-full flex items-center justify-center gap-1.5 text-xs font-medium h-9 rounded-lg mt-1"
                >
                  {passwordLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 4: DANGER ZONE */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <IoAlertCircleOutline className="w-3.5 h-3.5 text-[var(--danger-text)]" />
              <h3 className="text-xs font-semibold tracking-wider text-[var(--danger-text)] uppercase">Danger Zone</h3>
            </div>

            <div className="rounded-2xl glass-card p-3.5 sm:p-4 border border-[var(--danger-border)] bg-[var(--danger-bg)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">Delete Account</h4>
                  <p className="text-[11px] font-normal text-[var(--text-secondary)] leading-relaxed max-w-md">
                    Permanently delete your account, profile, and all conversation history. This cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleting || buttonLoading}
                  className="px-3 py-1.5 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger-text)] text-xs font-medium hover:bg-[var(--danger-hover)] active:scale-95 transition-all flex items-center justify-center gap-1.5 flex-shrink-0 self-start sm:self-center"
                >
                  <IoTrashOutline className="w-3.5 h-3.5" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="rounded-2xl glass-card p-5 sm:p-6 max-w-xs w-full space-y-3.5 animate-scale-in border border-[var(--danger-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-[var(--danger-text)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--danger-bg)] flex items-center justify-center flex-shrink-0">
                <IoTrashOutline className="w-4 h-4 text-[var(--danger-text)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Delete Account?</h3>
            </div>
            <p className="text-xs font-normal leading-relaxed text-[var(--text-secondary)]">
              Are you sure you want to permanently delete your ChatVerse account? All messages and conversations will be erased forever.
            </p>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 h-9 rounded-lg bg-[var(--btn-secondary-bg)] border border-[var(--btn-secondary-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--btn-secondary-hover)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 h-9 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-md shadow-red-500/25 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Confirm Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;

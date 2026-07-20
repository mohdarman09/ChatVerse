import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IoArrowBack, IoCamera, IoTrashOutline, IoKeySharp } from 'react-icons/io5'
import { FaUser, FaEye, FaEyeSlash } from 'react-icons/fa'
import { RiMessage2Fill, RiCalendarLine, RiMailLine } from 'react-icons/ri'
import { getUserProfileThunk, updateProfileThunk, changePasswordThunk, deleteAccountThunk } from '../../store/slice/user/user.thunk'

function Profile() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { userProfile, buttonLoading } = useSelector(state => state.userReducer)
  const fileInputRef = useRef(null)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPasswordFields, setShowPasswordFields] = useState({ current: false, new: false, confirm: false })
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    if (!userProfile?.profile?._id) {
      dispatch(getUserProfileThunk()).finally(() => setInitialLoading(false))
    } else {
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userProfile?.profile) {
      setFullName(userProfile.profile.fullName || '')
      setUsername(userProfile.profile.username || '')
    }
  }, [userProfile])

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const handleAvatarSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only .jpg, .jpeg, .png, and .webp files are allowed')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5 MB')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }

    setSelectedAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [avatarPreview])

  const removeAvatar = useCallback(() => {
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }
    setSelectedAvatar(null)
    setAvatarPreview(null)
  }, [avatarPreview])

  const currentAvatar = avatarPreview || userProfile?.profile?.avatar

  const getInitialsAvatar = () => {
    const name = userProfile?.profile?.fullName || 'User'
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    return initials
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const handleSave = async () => {
    const trimmedName = fullName.trim()
    const trimmedUsername = username.trim()

    if (!trimmedName) {
      return toast.error('Full name is required')
    }
    if (!trimmedUsername) {
      return toast.error('Username is required')
    }
    if (trimmedUsername.length < 3) {
      return toast.error('Username must be at least 3 characters')
    }

    const response = await dispatch(updateProfileThunk({
      fullName: trimmedName,
      username: trimmedUsername,
      avatar: selectedAvatar || undefined
    }))

    if (response?.payload?.success) {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
      setSelectedAvatar(null)
      setAvatarPreview(null)
    }
  }

  const handlePasswordInputChange = (e) => {
    setPasswordForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const togglePasswordField = (field) => {
    setShowPasswordFields(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm

    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error('All fields are required')
    }
    if (newPassword.length < 8) {
      return toast.error('New password must be at least 8 characters')
    }
    if (newPassword !== confirmPassword) {
      return toast.error('New password and confirm password do not match')
    }

    setPasswordLoading(true)
    const response = await dispatch(changePasswordThunk({ currentPassword, newPassword, confirmPassword }))
    setPasswordLoading(false)

    if (response?.payload?.success) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    const response = await dispatch(deleteAccountThunk())
    setDeleting(false)
    setShowDeleteModal(false)

    if (response?.payload?.success) {
      toast.success('Account deleted successfully')
      navigate('/login', { replace: true })
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 border-2 rounded-full border-primary/30 border-t-primary animate-spin" />
          <span className="text-sm text-gray-500">Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-[680px] mx-auto px-5 sm:px-6 py-10 animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="p-2 text-gray-400 transition-all duration-300 rounded-xl hover:bg-white/5 hover:text-white"
            aria-label="Back"
          >
            <IoArrowBack className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 shadow-lg rounded-xl gradient-primary shadow-primary/20">
              <RiMessage2Fill className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold gradient-text">Profile Settings</h1>
          </div>
        </div>

        <div className="rounded-[20px] glass-card p-8 space-y-6">
          {/* Section header */}
          <div className="flex items-center gap-4 pb-5 border-b border-white/[0.06]">
            <div className="w-9 h-9 rounded-[10px] gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
              <FaUser className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/90">Profile Information</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Manage your personal details and profile photo</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden ring-[3px] ring-primary/40 ring-offset-[3px] ring-offset-[var(--bg-primary)] shadow-xl shadow-primary/20">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Avatar"
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div
                  className={`w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ${currentAvatar ? 'hidden' : ''}`}
                >
                  <span className="text-3xl font-bold text-white/80">
                    {getInitialsAvatar()}
                  </span>
                </div>
              </div>
              <div className="absolute flex gap-1 -bottom-1 -right-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-white transition-all duration-300 rounded-full shadow-lg bg-primary hover:bg-primary/80 hover:scale-110 active:scale-95"
                  aria-label="Change photo"
                >
                  <IoCamera className="w-4 h-4" />
                </button>
                {(avatarPreview || userProfile?.profile?.avatar) && (
                  <button
                    onClick={removeAvatar}
                    className="p-2 text-white transition-all duration-300 bg-red-500 rounded-full shadow-lg hover:bg-red-500/80 hover:scale-110 active:scale-95"
                    aria-label="Remove photo"
                  >
                    <IoTrashOutline className="w-4 h-4" />
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
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">{userProfile?.profile?.fullName}</h2>
              <p className="text-sm text-gray-500 mt-0.5">@{userProfile?.profile?.username}</p>
              <p className="text-[11px] text-gray-600 mt-2.5 flex items-center justify-center gap-1.5">
                <RiCalendarLine className="w-3 h-3" />
                Joined {formatDate(userProfile?.profile?.createdAt)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="ml-1 text-xs font-semibold text-gray-400">Full Name</label>
              <div className="relative group">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 pr-4 py-3 text-sm input-glass h-11"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-xs font-semibold text-gray-400">Username</label>
              <div className="relative group">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 pr-4 py-3 text-sm input-glass h-11"
                  placeholder="Choose a username"
                />
              </div>
            </div>

            {userProfile?.profile?.email && (
            <div className="space-y-2">
              <label className="ml-1 text-xs font-semibold text-gray-400">Email</label>
              <div className="relative group">
                <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-gray-500" />
                <input
                  type="text"
                  value={userProfile.profile.email}
                  readOnly
                  className="pl-10 pr-4 py-3 text-sm text-gray-500 cursor-not-allowed input-glass h-11 opacity-60"
                />
              </div>
            </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={buttonLoading}
            className="flex items-center justify-center w-full gap-2 text-sm font-semibold tracking-wide glossy-btn h-11 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {buttonLoading ? (
              <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

        <div className="mt-8 rounded-[20px] glass-card p-8 space-y-6">
          {/* Section header */}
          <div className="flex items-center gap-4 pb-5 border-b border-white/[0.06]">
            <div className="w-9 h-9 rounded-[10px] gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
              <IoKeySharp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/90">Security</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Update your password and account security</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="ml-1 text-xs font-semibold text-gray-400">Current Password</label>
              <div className="relative group">
                <IoKeySharp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type={showPasswordFields.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInputChange}
                  className="pl-10 pr-12 py-3 text-sm input-glass h-11"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordField('current')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPasswordFields.current ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-xs font-semibold text-gray-400">New Password</label>
              <div className="relative group">
                <IoKeySharp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type={showPasswordFields.new ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange}
                  className="pl-10 pr-12 py-3 text-sm input-glass h-11"
                  placeholder="Enter new password (min 8 characters)"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordField('new')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPasswordFields.new ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-xs font-semibold text-gray-400">Confirm New Password</label>
              <div className="relative group">
                <IoKeySharp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type={showPasswordFields.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange}
                  className="pl-10 pr-12 py-3 text-sm input-glass h-11"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordField('confirm')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPasswordFields.confirm ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              onClick={handleChangePassword}
              disabled={passwordLoading}
              className="flex items-center justify-center w-full gap-2 text-sm font-semibold tracking-wide glossy-btn h-11 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {passwordLoading ? (
                <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-[20px] glass-card p-8 border border-red-500/20">
          {/* Section header */}
          <div className="flex items-center gap-4 pb-5 border-b border-red-500/10">
            <div className="w-9 h-9 rounded-[10px] bg-red-500/15 flex items-center justify-center shadow-lg shadow-red-500/10 flex-shrink-0">
              <IoTrashOutline className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Irreversible account actions</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-gray-400">
              This action cannot be undone. Permanently delete your account and all associated data, including messages and conversations.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={deleting || buttonLoading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold tracking-wide
                hover:from-red-600 hover:to-red-700 active:scale-[0.98]
                shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30
                transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                flex items-center justify-center gap-2"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <IoTrashOutline className="w-[14px] h-[14px]" />
                  Delete Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="rounded-[20px] glass-card p-8 max-w-md w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 pb-5 border-b border-white/[0.06] mb-6">
              <div className="w-9 h-9 rounded-[10px] bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <IoTrashOutline className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-white/90">Delete Account</h3>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-gray-400">
              This action cannot be undone. Are you sure you want to permanently delete your account and all associated data?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-medium
                  hover:bg-white/10 hover:border-white/20 active:scale-[0.98]
                  transition-all duration-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold tracking-wide
                  hover:from-red-600 hover:to-red-700 active:scale-[0.98]
                  shadow-lg shadow-red-500/25
                  transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile

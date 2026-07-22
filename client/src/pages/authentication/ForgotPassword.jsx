import { useState, useRef, useEffect } from "react";
import { IoKeySharp } from "react-icons/io5";
import { RiMailLine, RiLockPasswordLine } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { forgotPasswordThunk, resetPasswordThunk } from "../../store/slice/user/user.thunk";

function ForgotPassword() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { buttonLoading } = useSelector((state) => state.userReducer);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      return toast.error("Please enter your email");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return toast.error("Please enter a valid email address");
    }

    const response = await dispatch(forgotPasswordThunk({ email: email.trim() }));
    if (response?.payload?.success) {
      toast.success("OTP sent to your email");
      setStep(2);
      setResendTimer(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerifyOTP();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyOTP = () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      return toast.error("Please enter the complete 6-digit OTP");
    }
    setStep(3);
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      return toast.error("Please fill in all fields");
    }
    if (newPassword.length < 8) {
      return toast.error("Password must be at least 8 characters");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    const otpString = otp.join('');
    const response = await dispatch(resetPasswordThunk({
      email: email.trim(),
      otp: otpString,
      newPassword,
      confirmPassword
    }));

    if (response?.payload?.success) {
      toast.success("Password reset successfully! Please login.");
      navigate("/login");
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    const response = await dispatch(forgotPasswordThunk({ email: email.trim() }));
    if (response?.payload?.success) {
      toast.success("OTP resent to your email");
      setResendTimer(30);
      setOtp(['', '', '', '', '', '']);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (step === 1) handleSendOTP();
      if (step === 3) handleResetPassword();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--bg-primary)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="glass-card p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg shadow-primary/25">
              <RiLockPasswordLine className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Reset Password</h1>
              <p className="text-gray-400 text-sm mt-1">
                {step === 1 && "Enter your email to receive an OTP"}
                {step === 2 && "Enter the OTP sent to your email"}
                {step === 3 && "Create your new password"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-400 font-medium ml-1">Email Address</label>
                  <div className="relative group">
                    <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="input-glass pl-10 pr-4 py-3 h-11 w-full"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSendOTP}
                  disabled={buttonLoading}
                  className="glossy-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {buttonLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-400 font-medium ml-1">OTP</label>
                  <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-11 h-12 text-center text-lg font-bold text-white bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-300"
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleVerifyOTP}
                  className="glossy-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  Verify OTP
                </button>
                <div className="text-center">
                  <button
                    onClick={handleResend}
                    disabled={resendTimer > 0}
                    className="text-sm text-gray-400 hover:text-primary transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                  >
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-400 font-medium ml-1">New Password</label>
                  <div className="relative group">
                    <IoKeySharp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="input-glass pl-10 pr-12 py-3 h-11 w-full"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-400 font-medium ml-1">Confirm Password</label>
                  <div className="relative group">
                    <IoKeySharp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="input-glass pl-10 pr-12 py-3 h-11 w-full"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleResetPassword}
                  disabled={buttonLoading}
                  className="glossy-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {buttonLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </>
            )}
          </div>

          <p className="text-center text-gray-400 text-sm">
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;

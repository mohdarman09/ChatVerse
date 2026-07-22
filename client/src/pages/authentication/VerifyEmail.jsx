import { useEffect, useState, useRef } from "react";
import { RiMailCheckLine } from "react-icons/ri";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { verifyOTPThunk, resendOTPThunk } from "../../store/slice/user/user.thunk";

function VerifyEmail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated, buttonLoading } = useSelector((state) => state.userReducer);

  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerify();
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

  const handleVerify = async () => {
    if (!email) {
      return toast.error("Email is required");
    }
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      return toast.error("Please enter the complete 6-digit OTP");
    }

    const response = await dispatch(verifyOTPThunk({ email, otp: otpString }));
    if (response?.payload?.success) {
      toast.success("Email verified successfully!");
      navigate("/");
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || !email) return;

    const response = await dispatch(resendOTPThunk({ email }));
    if (response?.payload?.success) {
      toast.success("OTP resent to your email");
      setResendTimer(30);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
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
              <RiMailCheckLine className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Verify Email</h1>
              <p className="text-gray-400 text-sm mt-1">
                Enter the 6-digit OTP sent to {email || 'your email'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {!email && (
              <div className="space-y-1.5">
                <label className="text-sm text-gray-400 font-medium ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glass px-4 py-3 h-11 w-full"
                  placeholder="Enter your email"
                />
              </div>
            )}

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
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-11 h-12 text-center text-lg font-bold text-white bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-300"
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleVerify}
              disabled={buttonLoading}
              className="glossy-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {buttonLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Verify Email"
              )}
            </button>

            <div className="text-center">
              <button
                onClick={handleResend}
                disabled={resendTimer > 0 || buttonLoading}
                className="text-sm text-gray-400 hover:text-primary transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
              >
                {resendTimer > 0
                  ? `Resend OTP in ${resendTimer}s`
                  : "Resend OTP"}
              </button>
            </div>
          </div>

          <p className="text-center text-gray-400 text-sm">
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;

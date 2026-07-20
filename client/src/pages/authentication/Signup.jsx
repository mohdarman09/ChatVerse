import React, { useEffect, useState } from "react";
import { FaUser, FaEye, FaEyeSlash, FaVenusMars } from "react-icons/fa";
import { IoKeySharp } from "react-icons/io5";
import { RiMailLine } from "react-icons/ri";
import { RiUserAddLine } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { registerUserThunk } from "../../store/slice/user/user.thunk";
import toast from "react-hot-toast";

function Signup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, buttonLoading } = useSelector((state) => state.userReducer);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [signupData, setSignupData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "male"
  });

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated]);

  const handleInputChange = (e) => {
    setSignupData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSignup = async () => {
    const trimmedFullName = signupData.fullName.trim();
    const trimmedUsername = signupData.username.trim();
    const trimmedEmail = signupData.email.trim();

    if (!trimmedFullName || !trimmedUsername || !trimmedEmail || !signupData.password || !signupData.confirmPassword) {
      return toast.error("Please fill in all fields");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return toast.error("Please enter a valid email address");
    }
    if (signupData.password !== signupData.confirmPassword) {
      return toast.error("Password and Confirm Password do not match");
    }
    if (signupData.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    const response = await dispatch(registerUserThunk({
      fullName: trimmedFullName,
      username: trimmedUsername,
      email: trimmedEmail,
      password: signupData.password,
      gender: signupData.gender,
    }));
    if (response?.payload?.success) {
      navigate("/");
      toast.success("Account created successfully!");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSignup();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--bg-primary)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="glass-card p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg shadow-primary/25">
              <RiUserAddLine className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Create Account</h1>
              <p className="text-gray-400 text-sm mt-1">Join ChatVerse today</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-gray-400 font-medium ml-1">Full Name</label>
              <div className="relative group">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type="text"
                  name="fullName"
                  value={signupData.fullName}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="input-glass pl-10 pr-4 py-3 h-11"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-400 font-medium ml-1">Username</label>
              <div className="relative group">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type="text"
                  name="username"
                  value={signupData.username}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="input-glass pl-10 pr-4 py-3 h-11"
                  placeholder="Choose a username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-400 font-medium ml-1">Email</label>
              <div className="relative group">
                <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type="email"
                  name="email"
                  value={signupData.email}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="input-glass pl-10 pr-4 py-3 h-11"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-400 font-medium ml-1">Password</label>
              <div className="relative group">
                <IoKeySharp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={signupData.password}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="input-glass pl-10 pr-12 py-3 h-11"
                  placeholder="Create a password"
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
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={signupData.confirmPassword}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="input-glass pl-10 pr-12 py-3 h-11"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-400 font-medium ml-1">Gender</label>
              <div className="flex gap-3">
                {["male", "female"].map((gender) => (
                  <label
                    key={gender}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer border transition-all duration-300
                      ${signupData.gender === gender
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={gender}
                      checked={signupData.gender === gender}
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    <FaVenusMars className="w-4 h-4" />
                    <span className="text-sm font-medium capitalize">{gender}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleSignup}
              disabled={buttonLoading}
              className="glossy-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {buttonLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </div>

          <p className="text-center text-gray-400 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;

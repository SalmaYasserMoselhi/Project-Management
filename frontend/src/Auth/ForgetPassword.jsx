"use client";

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setEmail,
  forgotPassword,
  resetState,
} from "../features/Slice/authSlice/forgotPasswordSlice";
import {
  useSlideInAnimation,
  addAnimationStyles,
} from "../utils/animations.jsx";

function ForgotPassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const { email, error, successMessage, loading } = useSelector(
    (state) => state.forgotPassword
  );

  // Initialize slide-in animation from top
  useSlideInAnimation("top");

  useEffect(() => {
    // Add animation styles
    addAnimationStyles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setButtonDisabled(true);

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setButtonDisabled(false);
      return;
    }

    const resultAction = await dispatch(forgotPassword({ email }));
    if (forgotPassword.fulfilled.match(resultAction)) {
      setTimeout(() => {
        navigate("/verification", { state: { email } });
      }, 3000);
    } else {
      setButtonDisabled(false);
    }
  };

  useEffect(() => {
    return () => {
      dispatch(resetState());
    };
  }, [dispatch]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4">
      {/* Logo at the top */}
      <div className="mb-8">
        <img
          src="src/assets/coloredLogoWithWordBeside.png"
          alt="Nexus Logo"
          className="h-14 logo-fade-in"
        />
      </div>

      {/* Centered form with slide-in animation */}
      <div className="form-container w-full max-w-md">
        <div className="bg-white p-8 rounded-xl card-shadow">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-[#57356A] mb-2">
              Reset Password
            </h2>
            <p className="text-gray-600">
              Enter your email and we will send you a verification code
            </p>
          </div>

          {/* Form content */}
          {error && (
            <div className="mb-6 p-3 text-red-500 bg-red-50 rounded-lg text-center text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-3 text-green-500 bg-green-50 rounded-lg text-center text-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => dispatch(setEmail(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border input-animated border-gray-300 focus:ring-2 focus:ring-[#4D2D61] focus:border-transparent outline-none transition"
                placeholder="Enter your email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || buttonDisabled}
              className={`w-full py-2 px-3 rounded-md bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white text-sm font-medium transition-all hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] ${
                loading || buttonDisabled
                  ? "opacity-50 cursor-not-allowed pointer-events-none"
                  : ""
              }`}
            >
              {loading || buttonDisabled ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                "Send code"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/login"
              className={`text-[#4D2D61] hover:text-[#57356A] transition-all duration-300 text-sm font-medium ${
                buttonDisabled ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Back to login
            </a>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-6 text-center text-gray-500 text-xs">
          <div className="flex items-center justify-center mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1 text-[#4D2D61]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Secure Password Recovery
          </div>
          <p>
            We'll verify your identity before allowing you to reset your
            password.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;

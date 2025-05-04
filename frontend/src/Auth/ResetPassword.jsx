"use client";

import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  setPassword,
  setConfirmPassword,
  validatePassword,
  validateConfirmPassword,
  validateForm,
  resetState,
  resetPasswordThunk,
  verifyResetSession,
} from "../features/Slice/authSlice/resetPasswordSlice";
import {
  useSlideInAnimation,
  addAnimationStyles,
} from "../utils/animations.jsx";
import { store } from "../features/Store/Store";

function ResetPassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    password,
    confirmPassword,
    passwordError,
    confirmPasswordError,
    isFormValid,
    error,
    loading,
    successMessage,
    verifyLoading,
    verifyError,
  } = useSelector((state) => state.resetPassword);
  const [submitted, setSubmitted] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);

  // Initialize slide-in animation from top
  useSlideInAnimation("top");

  useEffect(() => {
    // Add animation styles
    addAnimationStyles();

    dispatch(verifyResetSession())
      .unwrap()
      .catch(() => {
        setTimeout(() => {
          navigate("/forgetpassword");
        }, 3000);
      });

    // Run validation on mount to set isFormValid correctly
    dispatch(validatePassword());
    dispatch(validateConfirmPassword());
    dispatch(validateForm());

    return () => {
      dispatch(resetState());
    };
  }, [dispatch, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setButtonDisabled(true);

    // Dispatch validations
    dispatch(validatePassword());
    dispatch(validateConfirmPassword());
    dispatch(validateForm());

    // Get the latest state after validation
    const state = store.getState().resetPassword;
    if (!state.isFormValid) {
      setButtonDisabled(false);
      return;
    }

    try {
      await dispatch(
        resetPasswordThunk({
          password: state.password,
          confirmPassword: state.confirmPassword,
        })
      ).unwrap();

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setButtonDisabled(false);
      console.error(err);
    }
  };

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
              Create New Password
            </h2>
            <p className="text-gray-600">
              Create a new password for your account
            </p>
          </div>

          {/* Form content */}
          {(error || verifyError) && (
            <div className="mb-6 p-3 text-red-500 bg-red-50 rounded-lg text-center text-sm">
              {error || verifyError}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-3 text-green-500 bg-green-50 rounded-lg text-center text-sm">
              {successMessage}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <input
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={(e) => dispatch(setPassword(e.target.value))}
                placeholder="Password"
                className={`w-full px-4 py-3 border input-animated rounded-lg ${
                  submitted && passwordError
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                required
              />
              {submitted && passwordError && (
                <p className="mt-1 text-sm text-red-500">{passwordError}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(e) => dispatch(setConfirmPassword(e.target.value))}
                placeholder="Confirm Password"
                className={`w-full px-4 py-3 border input-animated rounded-lg ${
                  submitted && confirmPasswordError
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                required
              />
              {submitted && confirmPasswordError && (
                <p className="mt-1 text-sm text-red-500">
                  {confirmPasswordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className={`w-full py-2 px-3 rounded-md bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white text-sm font-medium transition-all hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] ${
                loading || verifyLoading || buttonDisabled
                  ? "opacity-50 cursor-not-allowed pointer-events-none"
                  : ""
              }`}
              disabled={loading || verifyLoading || buttonDisabled}
            >
              {loading ? (
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
                  Resetting password...
                </span>
              ) : (
                "Reset password"
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

        {/* Password tips */}
        <div className="mt-6 bg-white p-4 rounded-lg card-shadow">
          <h3 className="text-sm font-medium text-[#57356A] mb-2">
            Password Tips:
          </h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-center">
              <svg
                className="h-3 w-3 mr-1 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Use at least 8 characters
            </li>
            <li className="flex items-center">
              <svg
                className="h-3 w-3 mr-1 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Include uppercase and lowercase letters
            </li>
            <li className="flex items-center">
              <svg
                className="h-3 w-3 mr-1 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Include at least one number and special character
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;

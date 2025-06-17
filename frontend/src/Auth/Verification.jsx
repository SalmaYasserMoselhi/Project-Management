"use client";

import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useSlideInAnimation,
  addAnimationStyles,
} from "../utils/animations.jsx";

const Verification = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();
  const inputRefs = useRef(Array(6).fill(null));
  const location = useLocation();
  const email = location.state?.email || "";

  // Initialize slide-in animation from top
  useSlideInAnimation("top");

  useEffect(() => {
    // Add animation styles
    addAnimationStyles();

    const timeout = setTimeout(() => {
      setError("");
      setSuccessMessage("");
    }, 5000);
    return () => clearTimeout(timeout);
  }, [error, successMessage]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setResendDisabled(false);
    }
  }, [timer]);

  useEffect(() => {
    setIsCodeValid(false);
  }, [otp]);

  const handleChange = (value, index) => {
    if (/\d/.test(value) || value === "") {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      setError("");
      setSuccessMessage("");

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    // Handle backspace to move to previous input
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      setResendLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch("/api/v1/users/forgotPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend code");
      }

      if (data.status === "success") {
        const sentAt = Date.now();
        localStorage.setItem("verificationSentAt", sentAt);
        setTimer(60);
        setResendDisabled(true);
        setOtp(["", "", "", "", "", ""]);
        setSuccessMessage("New verification code sent successfully!");
      }
    } catch (error) {
      setError(error.message || "Failed to resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!otp.every((digit) => digit !== "")) {
      setError("Please fill in all the OTP fields");
      return;
    }

    try {
      setVerifyLoading(true);
      setButtonDisabled(true);
      setError("");
      setSuccessMessage("");
      setIsCodeValid(false);

      const response = await fetch("/api/v1/users/verifyResetCode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ resetCode: otp.join("") }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid verification code");
      }

      if (data.status === "success") {
        setIsCodeValid(true);
        setSuccessMessage("Code verified successfully!");
        setRedirecting(true);
        setTimeout(() => {
          navigate("/resetpassword", { state: { email } });
        }, 1500);
      }
    } catch (error) {
      setIsCodeValid(false);
      setError(error.message || "Invalid verification code. Please try again.");
    } finally {
      setVerifyLoading(false);
      setButtonDisabled(false);
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
            <h2 className="text-2xl font-bold text-[#4d2d61] mb-2">
              Verification Code
            </h2>
            <p className="text-gray-600">
              We have sent a verification code to:
            </p>
            <p className="font-medium text-[#4D2D61] mt-1">{email}</p>
          </div>

          {/* Notification Messages */}
          {successMessage && (
            <div className="mb-6 p-3 text-green-500 bg-green-50 rounded-lg text-center text-sm">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 text-red-500 bg-red-50 rounded-lg text-center text-sm">
              {error}
            </div>
          )}

          {/* OTP Input Fields */}
          <div className="flex justify-center gap-2 mb-6 mt-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                id={`otp-${index}`}
                type="text"
                value={digit}
                maxLength={1}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                autoComplete="off"
                className={`w-12 h-12 text-center text-xl border input-animated rounded-md ${
                  isCodeValid
                    ? "border-green-400 ring-green-400"
                    : error && otp.some((d) => d !== "")
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
            ))}
          </div>

          <div className="text-center mb-6">
            <div className="text-gray-500 mb-2 font-medium">
              {`${Math.floor(timer / 60)}:${timer % 60 < 10 ? "0" : ""}${
                timer % 60
              }`}
            </div>
            <button
              onClick={handleResend}
              disabled={
                resendDisabled || resendLoading || verifyLoading || redirecting
              }
              className={`text-[#4D2D61] hover:text-[#4d2d61] transition-colors text-sm font-medium ${
                !(
                  resendDisabled ||
                  resendLoading ||
                  verifyLoading ||
                  redirecting
                )
                  ? "cursor-pointer"
                  : ""
              } ${
                resendDisabled || resendLoading || verifyLoading || redirecting
                  ? "disabled:text-gray-400"
                  : ""
              }`}
            >
              {resendLoading ? "Sending..." : "Resend code"}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              verifyLoading || resendLoading || buttonDisabled || redirecting
            }
            className={`w-full py-2 px-3 rounded-md bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white text-sm font-medium transition-all hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] ${
              verifyLoading || resendLoading || buttonDisabled || redirecting
                ? "opacity-50 cursor-not-allowed pointer-events-none"
                : ""
            }`}
          >
            {verifyLoading ? (
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
                Verifying...
              </span>
            ) : (
              "Verify"
            )}
          </button>

          <div className="mt-6 text-center">
            <a
              href="/login"
              className={`text-[#4D2D61] hover:text-[#4d2d61] transition-all duration-300 text-sm font-medium ${
                resendLoading || verifyLoading || buttonDisabled || redirecting
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
            >
              Back to login
            </a>
          </div>
        </div>

        {/* Verification info */}
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
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Time Sensitive
          </div>
          <p>
            The verification code will expire in 60 seconds. If you don't
            receive it, check your spam folder or request a new code.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Verification;

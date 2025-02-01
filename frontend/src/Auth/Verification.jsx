import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Verification = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const navigate = useNavigate();
  const inputRefs = useRef(Array(6).fill(null));
  const location = useLocation();
  const email = location.state?.email || "";

  useEffect(() => {
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

  const handleResend = async () => {
    try {
      setLoading(true);
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
        setTimer(60);
        setResendDisabled(true);
        setOtp(["", "", "", "", "", ""]);
        setSuccessMessage("New verification code sent successfully!");
      }
    } catch (error) {
      setError(error.message || "Failed to resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!otp.every((digit) => digit !== "")) {
      setError("Please fill in all the OTP fields");
      return;
    }

    try {
      setLoading(true);
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
        setTimeout(() => {
          navigate("/resetpassword", { state: { email } });
        }, 1500);
      }
    } catch (error) {
      setIsCodeValid(false);
      setError(error.message || "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-gray-50">
      {/* Notification Toasts */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {successMessage && (
          <div className="flex items-center bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg animate-fade-in-up">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {successMessage}
            <button
              onClick={() => setSuccessMessage("")}
              className="ml-4 text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg animate-fade-in-up">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
            <button
              onClick={() => setError("")}
              className="ml-4 text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Left Section - Image */}
      <div className="hidden md:block w-1/2 p-8 relative">
        <div className="absolute inset-x-0 top-0 flex justify-center mt-4">
          <img
            src="src/assets/Logo.png"
            alt="Beehive Logo"
            className="w-33 h-20"
          />
        </div>
        <img
          src="src/assets/pana.png"
          alt="Illustration"
          className="w-full h-auto mt-24"
        />
      </div>

      {/* Right Section - Verification Form */}
      <div className="w-full md:w-1/2 max-w-md p-8 bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-2xl font-semibold text-center text-gray-800 mb-4">
            Verification Code
          </h1>
        </div>

        <p className="text-center text-gray-500 mb-6">
          We have sent the verification code to this email:{" "}
          <span className="font-bold">{email}</span>
        </p>

        <div className="flex justify-center gap-2 mb-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              id={`otp-${index}`}
              type="text"
              value={digit}
              maxLength={1}
              onChange={(e) => handleChange(e.target.value, index)}
              autoComplete="off"
              className={`w-12 h-12 text-center text-xl border-1 rounded-lg focus:ring-1 transition-all ${
                isCodeValid
                  ? "border-green-400 ring-green-400"
                  : error
                  ? "border-red-500 ring-red-400"
                  : "border-gray-400 "
              }`}
            />
          ))}
        </div>

        <div className="text-center mb-4">
          <span className="text-gray-500 block">{`${Math.floor(timer / 60)}:${
            timer % 60 < 10 ? "0" : ""
          }${timer % 60}`}</span>
          <button
            onClick={handleResend}
            disabled={resendDisabled || loading}
            className="mt-1 text-gray-600 hover:text-[#4D2D61] disabled:text-gray-400 transition-colors"
          >
            {loading ? "Sending..." : "Resend code"}
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#4D2D61] text-white py-2 rounded-lg hover:bg-[#57356A] disabled:opacity-50 transition-colors"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </div>
    </div>
  );
};

export default Verification;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch('/api/v1/users/verifyResetSession', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          setError('Invalid reset session. Please restart the password reset process.');
          setTimeout(() => {
            navigate('/forgot-password');
          }, 3000);
        }
      } catch (err) {
        setError('Session verification failed. Please try again.');
        setTimeout(() => {
          navigate('/forgot-password');
        }, 3000);
      }
    };

    verifySession();
  }, [navigate]);
  
  const validatePassword = () => {
    if (password.length < 8 || !/\d/.test(password)) {
      setPasswordError(
        "Password must be at least 8 characters long and contain both letters and numbers."
      );
      setIsFormValid(false);
    } else {
      setPasswordError("");
      validateForm();
    }
  };

  const validateConfirmPassword = () => {
    if (confirmPassword !== password) {
      setConfirmPasswordError("Passwords do not match");
      setIsFormValid(false);
    } else {
      setConfirmPasswordError("");
      validateForm();
    }
  };

  const validateForm = () => {
    if (
      password.length >= 8 &&
      /\d/.test(password) &&
      confirmPassword === password
    ) {
      setIsFormValid(true);
    } else {
      setIsFormValid(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    validatePassword();
    validateConfirmPassword();

    if (!isFormValid) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/v1/users/resetPassword", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for cookies
        body: JSON.stringify({
          password,
          passwordConfirm: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password reset failed");
      }

      if (data.status === "success") {
        setSuccessMessage("Password reset successful!");
        // Reset form
        setPassword("");
        setConfirmPassword("");

        // Short delay before redirecting to login
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Password reset failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between max-w-6xl">
        {/* Form */}
        <div className="w-full lg:w-1/2 max-w-md">
          <div className="bg-white p-8 rounded-lg">
            <div className="flex justify-center lg:justify-start mb-6">
              <img
                src="src/assets/Logo.png"
                alt="Logo"
                className="h-auto w-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-[#4D2D61] mb-6 lg:text-left text-center">
              Create New Password
            </h2>
            <p className="text-gray-500 mb-8">
              Create a new password for your account
            </p>

            {error && (
              <div className="mb-4 p-3 text-red-500 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 text-green-500 bg-green-50 rounded-lg">
                {successMessage}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <input
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={validatePassword}
                  placeholder="Password"
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:border-2 ${
                    passwordError
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 focus:border-[#4D2D61]"
                  }`}
                  required
                />
                <p
                  className={`mt-1 text-sm ${
                    passwordError ? "text-red-500" : "text-gray-500"
                  }`}
                >
                  {passwordError ||
                    "Password must be at least 8 characters long and contain both letters and numbers."}
                </p>
              </div>

              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={validateConfirmPassword}
                  placeholder="Confirm Password"
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:border-2 ${
                    passwordError
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 focus:border-[#4D2D61]"
                  }`}
                  required
                />
                <p
                  className={`mt-1 text-sm ${
                    confirmPasswordError ? "text-red-500" : "text-gray-500"
                  }`}
                >
                  {confirmPasswordError || "Passwords must match."}
                </p>
              </div>

              <button
                type="submit"
                className={`w-full py-2 px-4 rounded-md bg-[#4D2D61] hover:bg-[#57356A] text-white ${
                  isFormValid ? "" : "cursor-not-allowed"
                }`}
                disabled={!isFormValid || loading}
              >
                {loading ? "Resetting password..." : "Reset password"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side - Illustration */}
        <div className="hidden lg:block w-full lg:w-1/2 pr-12 mb-8 lg:mb-0">
          <div className="flex flex-col items-center space-y-6">
            <img
              src="src/assets/reset.png"
              alt="Productivity Illustration"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;

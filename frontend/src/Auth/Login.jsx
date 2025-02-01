import "react";
import { useState } from "react";
const API_BASE_URL = "/api/v1";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    setEmailError("");
    setPasswordError("");
    setErrorMessage("");

    // Validate inputs
    let valid = true;
    if (!email) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      valid = false;
    }

    if (!valid) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }
  
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      window.location.href = "/dashboard";
      
    } catch (error) {
      setErrorMessage(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    try {
      setOAuthLoading(true);
      setErrorMessage("");
      // Get the current frontend URL dynamically
      const frontendUrl = window.location.origin;
      window.location.href = `${API_BASE_URL}/users/auth/${provider}?frontendUrl=${frontendUrl}`;
    } catch (error) {
      setErrorMessage(
        "Authentication failed. Please try again.",
        error.message
      );
      setOAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between max-w-6xl">
        {/* Login Form */}
        <div className="w-full lg:w-1/2 max-w-md">
          <div className="bg-white p-8 rounded-lg ">
            <div className="flex justify-center lg:justify-start mb-6">
              <img
                src="src/assets/Logo.png"
                alt="Logo"
                className="h-auto w-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-[#4D2D61] mb-6 lg:text-left text-center">
              Sign In
            </h2>
            {errorMessage && (
              <div className="mb-4 text-red-600 text-center">
                {errorMessage}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  autoComplete="username"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail"
                  className={`w-full px-4 py-2 border ${
                    emailError ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:ring-2 focus:border-[#4D2D61] focus:border-2`}
                  required
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={`w-full px-4 py-2 border ${
                    passwordError ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:ring-2 focus:border-[#4D2D61] focus:border-2`}
                  required
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                )}
              </div>

              <div className="flex items-center justify-start">
                <a
                  href="/forgetpassword"
                  className="text-sm text-[#4D2D61] hover:text-[#57356A]"
                >
                  Forgot password ?
                </a>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-[#4D2D61] text-white py-2 px-4 rounded-md hover:bg-[#57356A] focus:outline-none focus:ring-2 focus:ring-[#57356A] focus:ring-offset-2"
              >
                {loading ? "Loading..." : "Sign in"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <hr className="flex-1 border-t border-gray-300" />
                <span>OR</span>
                <hr className="flex-1 border-t border-gray-300" />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleOAuthLogin("google")}
                disabled={oauthLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:border-2 focus:border-[#4D2D61] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img
                  src="src/assets/icons8-google-48.png"
                  alt="Google"
                  className="w-5 h-5"
                />
                {oauthLoading ? "Connecting..." : "Continue with Google"}
              </button>

              <button
                onClick={() => handleOAuthLogin("github")}
                disabled={oauthLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:border-2 focus:border-[#4D2D61] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img
                  src="src/assets/icons8-github-90.png"
                  alt="Github"
                  className="w-5 h-5"
                />
                {oauthLoading ? "Connecting..." : "Continue with Github"}
              </button>
            </div>
          </div>
          {/* Sign Up Link */}
          <div className="mt-8 text-center text-sm">
            <span>Don&apos;t have an account ? </span>
            <a
              href="/signup"
              className="text-[#4D2D61] hover:text-[#57356A] font-medium"
            >
              Create one
            </a>
          </div>
        </div>

        {/* Right Side - Illustration */}
        <div className="hidden lg:block w-full lg:w-1/2 pr-12 mb-8 lg:mb-0">
          <div className="flex flex-col items-center space-y-6">
            <img
              src="src/assets/cuate.png"
              alt="Productivity Illustration"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

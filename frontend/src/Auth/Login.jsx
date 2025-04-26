import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import {
  setEmail,
  setPassword,
  setEmailError,
  setPasswordError,
  setErrorMessage,
  setOAuthLoading,
  resetErrors,
  loginUser,
} from "../features/Slice/authSlice/loginSlice";
import { fetchUserData } from "../features/Slice/userSlice/userSlice";
import { useNavigate } from "react-router-dom";
import { useChat } from "../context/chat-context";

const API_BASE_URL = "/api/v1";

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { email, password } = useSelector((state) => state.login.form);
  const { setCurrentUser } = useChat();

  const { errorMessage, emailError, passwordError, loading, oauthLoading } =
    useSelector((state) => state.login);
  const [activeButton, setActiveButton] = useState(null);

  const auth = useSelector((state) => state.auth);
  const currentUser = auth?.user;

  // Check if user is already logged in
  useEffect(() => {
    if (currentUser?._id) {
      navigate("/main/chat");
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActiveButton("signin");

    dispatch(resetErrors());

    let valid = true;

    if (!email) {
      dispatch(setEmailError("Email is required."));
      valid = false;
    } else if (!validateEmail(email)) {
      dispatch(setEmailError("Please enter a valid email address."));
      valid = false;
    }

    if (!password) {
      dispatch(setPasswordError("Password is required."));
      valid = false;
    } else if (password.length < 8) {
      dispatch(
        setPasswordError("Password must be at least 8 characters long.")
      );
      valid = false;
    }

    if (!valid) {
      setActiveButton(null);
      return;
    }

    try {
      const resultAction = await dispatch(loginUser({ email, password }));
      if (loginUser.fulfilled.match(resultAction)) {
        // Fetch user data after successful login
        await dispatch(fetchUserData());
        navigate("/main/chat");
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setActiveButton(null);
    }
  };

  const handleOAuthLogin = async (provider) => {
    try {
      setActiveButton(provider);
      dispatch(
        setOAuthLoading({
          loading: true,
          error: null,
          activeProvider: provider,
        })
      );
      dispatch(setErrorMessage(""));

      // Add credentials parameter for cookie handling
      const frontendUrl = window.location.origin;
      window.location.href = `${API_BASE_URL}/users/auth/${provider}?frontendUrl=${frontendUrl}`;
    } catch (error) {
      dispatch(
        setOAuthLoading({
          loading: false,
          error: error.message || "Authentication failed. Please try again.",
          activeProvider: null,
        })
      );
      setActiveButton(null);
    }
  };

  const isButtonDisabled = (buttonName) =>
    activeButton !== null && activeButton !== buttonName;

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
                  onChange={(e) => dispatch(setEmail(e.target.value))}
                  placeholder="E-mail"
                  className={`w-full px-4 py-2 border ${
                    emailError ? "border-red-500" : "border-gray-300"
                  } rounded-md`}
                  disabled={isButtonDisabled("signin")}
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
                  onChange={(e) => dispatch(setPassword(e.target.value))}
                  placeholder="Password"
                  className={`w-full px-4 py-2 border ${
                    passwordError ? "border-red-500" : "border-gray-300"
                  } rounded-md`}
                  disabled={isButtonDisabled("signin")}
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                )}
              </div>

              <div className="flex items-center justify-start">
                <a
                  href="/forgetpassword"
                  className={`text-sm text-[#4D2D61] hover:text-[#57356A] ${
                    isButtonDisabled("signin")
                      ? "pointer-events-none opacity-50"
                      : ""
                  }`}
                >
                  Forgot password ?
                </a>
              </div>

              <button
                disabled={loading || isButtonDisabled("signin")}
                type="submit"
                className={`w-full bg-[#4D2D61] text-white py-2 px-4 rounded-md ${
                  isButtonDisabled("signin")
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-[#57356A]"
                }`}
              >
                Sign in
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <hr className="flex-1 border-t border-gray-300" />
                <span>OR</span>
                <hr className="flex-1 border-t border-gray-300" />
              </div>
            </div>
            {/* Social Buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleOAuthLogin("google")}
                disabled={isButtonDisabled("google")}
                className={`w-full border p-3 rounded flex items-center justify-center ${
                  isButtonDisabled("google")
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50"
                }`}
              >
                <img
                  src="src/assets/icons8-google-48.png"
                  alt="Google"
                  className="h-5 w-5 mr-3"
                />
                <span className="text-gray-700">Continue with Google</span>
              </button>

              <button
                onClick={() => handleOAuthLogin("github")}
                disabled={isButtonDisabled("github")}
                className={`w-full border p-3 rounded flex items-center justify-center ${
                  isButtonDisabled("github")
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50"
                }`}
              >
                <img
                  src="src/assets/icons8-github-90.png"
                  alt="GitHub"
                  className="h-5 w-5 mr-3"
                />
                <span className="text-gray-700">Continue with GitHub</span>
              </button>
            </div>
            {oauthLoading.error && (
              <div className="mt-3 p-3 text-red-600 bg-red-50 rounded-lg border border-red-100 text-sm">
                ⚠️ {oauthLoading.error}
              </div>
            )}
          </div>
          {/* Sign Up Link */}
          <div className="mt-8 text-center text-sm">
            <span>Don&apos;t have an account ? </span>
            <a
              href="/signup"
              className={`text-[#4D2D61] hover:text-[#57356A] font-medium ${
                activeButton !== null ? "pointer-events-none opacity-50" : ""
              }`}
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

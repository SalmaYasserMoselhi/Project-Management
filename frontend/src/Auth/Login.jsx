"use client"

import { useSelector, useDispatch } from "react-redux"
import { useState, useEffect } from "react"
import {
  setEmail,
  setPassword,
  setEmailError,
  setPasswordError,
  setErrorMessage,
  setOAuthLoading,
  resetErrors,
  loginUser,
} from "../features/Slice/authSlice/loginSlice"
import { fetchUserData } from "../features/Slice/userSlice/userSlice"
import { useNavigate } from "react-router-dom"
import { useChat } from "../context/chat-context"
import { useSlideInAnimation, addAnimationStyles } from "../utils/animations.jsx"

const API_BASE_URL = "/api/v1"

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { email, password } = useSelector((state) => state.login.form)
  const { setCurrentUser } = useChat()

  const { errorMessage, emailError, passwordError, loading, oauthLoading } = useSelector((state) => state.login)
  const [activeButton, setActiveButton] = useState(null)

  const auth = useSelector((state) => state.auth)
  const currentUser = auth?.user

  // Initialize slide-in animation
  useSlideInAnimation()

  useEffect(() => {
    // Add animation styles
    addAnimationStyles()

    // Check if user is already logged in
    if (currentUser?._id) {
      navigate("/main/chat")
    }

    // Fix for layout issues - remove any overflow hidden classes from body and root
    document.body.style.overflow = "auto"
    document.body.style.height = "auto"
    const rootElement = document.getElementById("root")
    if (rootElement) {
      rootElement.style.overflow = "auto"
      rootElement.style.height = "auto"
    }

    // Add a style tag to ensure the right panel extends full height
    const styleTag = document.createElement("style")
    styleTag.id = "auth-fix-styles"
    styleTag.innerHTML = `
      .auth-right-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 50%;
        background: linear-gradient(135deg, #4d2d61 0%, #7b4397 100%);
        z-index: 10;
      }
      
      @media (max-width: 768px) {
        .auth-right-panel {
          display: none;
        }
      }
      
      .auth-left-panel {
        width: 100%;
        padding: 2rem;
      }
      
      @media (min-width: 768px) {
        .auth-left-panel {
          width: 50%;
          padding: 2rem;
        }
      }
    `

    // Only add the style tag if it doesn't exist
    if (!document.getElementById("auth-fix-styles")) {
      document.head.appendChild(styleTag)
    }

    return () => {
      // Clean up the style tag when component unmounts
      const existingStyle = document.getElementById("auth-fix-styles")
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [currentUser, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setActiveButton("signin")

    dispatch(resetErrors())

    let valid = true

    if (!email) {
      dispatch(setEmailError("Email is required."))
      valid = false
    } else if (!validateEmail(email)) {
      dispatch(setEmailError("Please enter a valid email address."))
      valid = false
    }

    if (!password) {
      dispatch(setPasswordError("Password is required."))
      valid = false
    } else if (password.length < 8) {
      dispatch(setPasswordError("Password must be at least 8 characters long."))
      valid = false
    }

    if (!valid) {
      setActiveButton(null)
      return
    }

    try {
      const resultAction = await dispatch(loginUser({ email, password }))
      if (loginUser.fulfilled.match(resultAction)) {
        // Fetch user data after successful login
        await dispatch(fetchUserData())
        navigate("/main/dashboard")
      }
    } catch (error) {
      console.error("Login error:", error)
    } finally {
      setActiveButton(null)
    }
  }

  const handleOAuthLogin = async (provider) => {
    try {
      setActiveButton(provider)
      dispatch(
        setOAuthLoading({
          loading: true,
          error: null,
          activeProvider: provider,
        }),
      )
      dispatch(setErrorMessage(""))

      // Add credentials parameter for cookie handling
      const frontendUrl = window.location.origin
      window.location.href = `${API_BASE_URL}/users/auth/${provider}?frontendUrl=${frontendUrl}`
    } catch (error) {
      dispatch(
        setOAuthLoading({
          loading: false,
          error: error.message || "Authentication failed. Please try again.",
          activeProvider: null,
        }),
      )
      setActiveButton(null)
    }
  }

  const isButtonDisabled = (buttonName) => activeButton !== null && activeButton !== buttonName

  // Find the first error key and message for login validation
  const firstErrorKey = emailError ? "email" : passwordError ? "password" : null
  const firstErrorMessage = emailError || passwordError || null

  return (
    <div className="relative w-full min-h-screen">
      {/* Fixed right panel */}
      <div className="auth-right-panel">
        <div className="flex flex-col items-center h-full">
          <img
            src="src/assets/LogoF.png"
            alt="Nexus Logo"
            className="h-14 mt-8 mb-4 mx-auto"
            style={{ display: "block" }}
          />
          <div className="animated-circle"></div>
          <div className="animated-circle"></div>
          <div className="p-4 h-full flex flex-col justify-center w-full max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-white mb-3 text-left">Experience Seamless Collaboration</h2>
            <div className="feature-card">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                </div>
                <span className="text-white font-medium">Shared Workspaces</span>
              </div>
              <p className="text-white/80 text-sm mt-2 ml-11">Collaborate with your team in real-time</p>
            </div>

            <div className="feature-card">
              <div className="flex items-center">
                <div className="animated-circle"></div>
                <div className="animated-circle"></div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
                <span className="text-white font-medium">Smart Notifications</span>
              </div>
              <p className="text-white/80 text-sm mt-2 ml-11">Stay updated with important changes</p>
            </div>

            <div className="feature-card">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <span className="text-white font-medium">Integrated Chat</span>
              </div>
              <p className="text-white/80 text-sm mt-2 ml-11">Communicate without leaving the platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Left panel with form */}
      <div className="auth-left-panel flex flex-col items-center justify-center min-h-screen">
        {/* Logo at the top - only visible on mobile */}
        <div className="md:hidden mb-8 mt-4">
          <img src="src/assets/coloredLogoWithWordBeside.png" alt="Nexus Logo" className="h-14 logo-fade-in" />
        </div>

        <div className="w-full max-w-md mx-auto px-4">
          <div className="bg-white p-8 rounded-xl card-shadow form-container">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-[#57356A] mb-2">Welcome Back to Nexus!</h2>
              <p className="text-gray-600">Sign in to access your workspace and collaborate with your team.</p>
            </div>

            {/* Show server error (e.g., incorrect email or password) as a box above the form */}
            {errorMessage && !firstErrorMessage && (
              <div className="mb-6 p-3 text-red-500 bg-red-50 rounded-lg text-center text-sm">
                {errorMessage.includes("JSON")
                  ? "A server error occurred. Please try again later."
                  : errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input
                  type="email"
                  value={email}
                  autoComplete="username"
                  onChange={(e) => dispatch(setEmail(e.target.value))}
                  placeholder="E-mail"
                  className={`w-full px-4 py-3 border input-animated rounded-lg ${
                    emailError ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isButtonDisabled("signin")}
                />
                {firstErrorKey === "email" && <p className="text-red-500 text-xs mt-1">{firstErrorMessage}</p>}
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => dispatch(setPassword(e.target.value))}
                  placeholder="Password"
                  className={`w-full px-4 py-3 border input-animated rounded-lg ${
                    passwordError ? "border-red-500" : "border-gray-300"
                  }`}
                  disabled={isButtonDisabled("signin")}
                />
                {firstErrorKey === "password" && <p className="text-red-500 text-xs mt-1">{firstErrorMessage}</p>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input type="checkbox" id="remember" className="h-4 w-4 text-[#4D2D61] border-gray-300 rounded" />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <a
                  href="/forgetpassword"
                  className={`text-sm text-[#4D2D61] hover:text-[#57356A] transition-all duration-300 ${
                    isButtonDisabled("signin") ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Forgot password?
                </a>
              </div>

              <button
                disabled={loading || isButtonDisabled("signin")}
                type="submit"
                className={`w-full py-2 px-3 rounded-md bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white text-sm font-medium transition-all hover:shadow-lg hover:scale-[1.01] hover:translate-y-[-2px] ${
                  isButtonDisabled("signin") ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
                }`}
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
                    Logging in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="my-4 flex items-center">
              <hr className="flex-grow border-gray-300" />
              <span className="mx-2 text-gray-500 text-xs">OR</span>
              <hr className="flex-grow border-gray-300" />
            </div>

            {/* Social Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleOAuthLogin("google")}
                disabled={isButtonDisabled("google")}
                className={`w-full border border-gray-200 py-3 px-4 rounded-md flex items-center justify-center transition-all ${
                  isButtonDisabled("google")
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50 hover:border-[#4D2D61]"
                }`}
              >
                {oauthLoading.loading && oauthLoading.activeProvider === "google" ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#4D2D61]"
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
                    Connecting with Google...
                  </span>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleOAuthLogin("github")}
                disabled={isButtonDisabled("github")}
                className={`w-full border border-gray-200 py-3 px-4 rounded-md flex items-center justify-center transition-all ${
                  isButtonDisabled("github")
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50 hover:border-[#4D2D61]"
                }`}
              >
                {oauthLoading.loading && oauthLoading.activeProvider === "github" ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#4D2D61]"
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
                    Connecting with GitHub...
                  </span>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span>Continue with GitHub</span>
                  </>
                )}
              </button>
            </div>

            {oauthLoading.error && (
              <div className="mt-4 p-3 text-red-600 bg-red-50 rounded-lg border border-red-100 text-sm">
                ⚠️ {oauthLoading.error}
              </div>
            )}

            {/* Sign Up Link */}
            <p className="mt-4 text-center text-xs text-gray-600">
              Don&apos;t have an account?{" "}
              <a
                href="/signup"
                className={`text-[#4D2D61] hover:underline font-semibold transition-all duration-300 ${
                  activeButton !== null ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Create new one
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

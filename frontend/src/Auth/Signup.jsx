import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const schema = yup.object().shape({
  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required"),
  username: yup
    .string()
    .matches(/^[A-Za-z]/, "Username must start with a letter")
    .min(3, "Username must be at least 3 characters")
    .required("Username is required"),
  firstName: yup
    .string()
    .matches(/^[A-Za-z]+$/, "First name is required")
    .required("First name is required"),
  lastName: yup.string().notRequired(),
  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  passwordConfirm: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("password")], "Passwords must match"),
});

export default function Signup() {
  const API_BASE_URL = "/api/v1";
  const navigate = useNavigate();

  const [oauthStates, setOauthStates] = useState({
    loading: false,
    error: null,
    activeProvider: null,
  });

  const handleOAuthLogin = async (provider) => {
    try {
      setOauthStates({
        loading: true,
        error: null,
        activeProvider: provider,
      });

      if (!['google', 'github'].includes(provider)) {
        throw new Error('Invalid authentication provider');
      }

      window.location.href = `${API_BASE_URL}/users/auth/${provider}?frontendUrl=${window.location.origin}`;
      
    } catch (error) {
      setOauthStates({
        loading: false,
        error: error.message || 'Authentication failed. Please try again.',
        activeProvider: null,
      });
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError("");
    try {
      const requestData = {
        ...data,
        passwordConfirm: data.passwordConfirm,
      };

      const response = await fetch(`${API_BASE_URL}/users/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Signup failed');
      }

      console.log("Signup successful:", responseData);
      reset();
      navigate("/login");
    } catch (error) {
      setServerError(
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Rest of the component remains the same
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 pt-2">
      <div className="max-w-5xl w-full bg-white rounded-lg shadow-md flex">
        {/* Left Section - Image */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 bg-gray-100 rounded-l-lg">
          <img
            src="src\assets\SignUpPhoto.png"
            alt="Illustration"
            className="w-6/4"
          />
        </div>

        {/* Right Section - Form */}
        <div className="flex flex-col items-center w-full md:w-1/2 p-8">
          {/* Logo */}
          <div className="mb-6">
            <img
              src="src\assets\Logo.png"
              alt="Beehive Logo"
              className="h-16"
            />
          </div>

          {/* Form Title */}
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Create Account
          </h1>
          {serverError && (
            <p className="text-red-500 text-m mt-2 mb-4">{serverError}</p>
          )}
          {/* Sign-Up Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="Email"
                {...register("email")}
                className={`w-full border h-12 p-3 rounded focus:outline-none focus:ring-2 ${
                  errors.email
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 focus:ring-[#4D2D61]"
                }`}
              />
              {errors.email && (
                <p className="text-m text-red-500 p-2 rounded mt-1 shadow-sm">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <input
                type="text"
                placeholder="Username"
                {...register("username")}
                className={`w-full border h-12 p-3 rounded focus:outline-none focus:ring-2 ${
                  errors.username
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 focus:ring-[#4D2D61]"
                }`}
              />
              {errors.username && (
                <p className="text-m text-red-500 p-2 rounded mt-1 shadow-sm">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* First Name and Last Name */}
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              {/* First Name */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="First Name"
                  {...register("firstName")}
                  className={`w-full border h-12 p-3 rounded focus:outline-none focus:ring-2 ${
                    errors.firstName
                      ? "border-red-500 focus:ring-red-400"
                      : "border-gray-300 focus:ring-[#4D2D61]"
                  }`}
                />
                {errors.firstName && (
                  <p className="text-m text-red-500 p-2 rounded mt-1 shadow-sm">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Last Name (Optional)"
                  {...register("lastName")}
                  className={`w-full border h-12 p-3 rounded focus:outline-none focus:ring-2 ${
                    errors.lastName
                      ? "border-red-500 focus:ring-red-400"
                      : "border-gray-300 focus:ring-[#4D2D61]"
                  }`}
                />
                {errors.lastName && (
                  <p className="text-m text-red-500 p-2 rounded mt-1 shadow-sm">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <input
                type="password"
                placeholder="Password"
                {...register("password")}
                className={`w-full border h-12 p-3 rounded focus:outline-none focus:ring-2 ${
                  errors.password
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 focus:ring-[#4D2D61]"
                }`}
              />
              {errors.password && (
                <p className="text-m text-red-500 p-2 rounded mt-1 shadow-sm">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <input
                type="password"
                placeholder="Confirm Password"
                {...register("passwordConfirm")}
                className={`w-full border h-12 p-3 rounded focus:outline-none focus:ring-2 ${
                  errors.passwordConfirm
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 focus:ring-[#4D2D61]"
                }`}
              />
              {errors.passwordConfirm && (
                <p className="text-m text-red-500 p-2 rounded mt-1 shadow-sm">
                  {errors.passwordConfirm.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#4D2D61] h-13 text-white font-bold p-3 rounded hover:bg-[#57356A] transition duration-300"
              disabled={loading}
            >
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </form>

          {/* OR Divider */}
          <div className="my-4 flex items-center justify-center w-full">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-2 text-gray-500">OR</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          {/* Social Buttons */}
          <div className="space-y-2 w-full">          
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={oauthStates.loading}
              className={`w-full border h-12 p-3 rounded flex items-center justify-center transition-all duration-300 ${
                oauthStates.loading && oauthStates.activeProvider === 'google'
                ? 'bg-gray-100 border-gray-300 opacity-75 cursor-not-allowed'
                : 'bg-white border-gray-300 hover:border-[#4D2D61] hover:bg-gray-50'
              }`}
            >
              {oauthStates.loading && oauthStates.activeProvider === 'google' ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#4D2D61] mr-3"></div>
                  <span className="text-gray-600">Authenticating with Google...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <img
                    src="src/assets/icons8-google-48.png"
                    alt="Google"
                    className="h-5 w-5 mr-3"
                  />
                  <span className="text-gray-700">Continue with Google</span>
                </div>
              )}
            </button>
          
            <button
              onClick={() => handleOAuthLogin('github')}
              disabled={oauthStates.loading}
              className={`w-full border h-12 p-3 rounded flex items-center justify-center transition-all duration-300 ${
                oauthStates.loading && oauthStates.activeProvider === 'github'
                ? 'bg-gray-100 border-gray-300 opacity-75 cursor-not-allowed'
                : 'bg-white border-gray-300 hover:border-[#4D2D61] hover:bg-gray-50'
              }`}
            >
              {oauthStates.loading && oauthStates.activeProvider === 'github' ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#4D2D61] mr-3"></div>
                  <span className="text-gray-600">Authenticating with GitHub...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <img
                    src="src/assets/icons8-github-90.png"
                    alt="GitHub"
                    className="h-5 w-5 mr-3"
                  />
                  <span className="text-gray-700">Continue with GitHub</span>
                </div>
              )}
            </button>
          </div>
          {oauthStates.error && (
            <div className="mt-3 p-3 text-red-600 bg-red-50 rounded-lg border border-red-100 text-sm">
              ⚠️ {oauthStates.error}
            </div>
          )}

          {/* Sign In Link */}
          <p className="mt-6 text-center text-sm text-gray-500 font-bold">
            Already have an account?{" "}
            <a href="/login" className="text-[#4D2D61] hover:underline font-bold">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
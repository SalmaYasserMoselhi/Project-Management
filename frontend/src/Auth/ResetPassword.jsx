import { useEffect } from "react";
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

  useEffect(() => {
    dispatch(verifyResetSession())
      .unwrap()
      .catch(() => {
        setTimeout(() => {
          navigate("/forgot-password");
        }, 3000);
      });

    return () => {
      dispatch(resetState());
    };
  }, [dispatch, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(validatePassword());
    dispatch(validateConfirmPassword());
    dispatch(validateForm());

    if (!isFormValid) return;

    try {
      await dispatch(
        resetPasswordThunk({ password, confirmPassword })
      ).unwrap();

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error(err);
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

            {(error || verifyError) && (
              <div className="mb-4 p-3 text-red-500 bg-red-50 rounded-lg">
                {error || verifyError}
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
                  onChange={(e) => dispatch(setPassword(e.target.value))}
                  onBlur={() => {
                    dispatch(validatePassword());
                    dispatch(validateForm());
                  }}
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
                  {passwordError}
                </p>
              </div>

              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => dispatch(setConfirmPassword(e.target.value))}
                  onBlur={() => {
                    dispatch(validateConfirmPassword());
                    dispatch(validateForm());
                  }}
                  placeholder="Confirm Password"
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:border-2 ${
                    confirmPasswordError
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
                  {confirmPasswordError}
                </p>
              </div>

              <button
                type="submit"
                className={`w-full py-2 px-4 rounded-md bg-[#4D2D61] hover:bg-[#57356A] text-white ${
                  isFormValid ? "" : "cursor-not-allowed"
                }`}
                disabled={!isFormValid || loading || verifyLoading}
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

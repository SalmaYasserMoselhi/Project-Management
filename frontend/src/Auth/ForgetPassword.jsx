import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setEmail,
  forgotPassword,
  resetState,
} from "../features/Slice/authSlice/forgotPasswordSlice";

function ForgotPassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const { email, error, successMessage, loading } = useSelector(
    (state) => state.forgotPassword
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
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
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between max-w-6xl">
        {/* Left side with form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 py-12">
          <div className="max-w-md w-full mx-auto">
            {/* logo */}
            <div className="flex justify-center lg:justify-start mb-6">
              <img
                src="src/assets/Logo.png"
                alt="Logo"
                className="h-auto w-auto"
              />
            </div>

            {/* Form content */}
            <div>
              <h2 className="text-3xl font-bold text-[#4D2D61] mb-2">
                Reset Password
              </h2>
              <p className="text-gray-500 mb-8">
                Enter your email and we will send you a verification code
              </p>
              {error && <div className="text-red-500 mb-4">{error}</div>}
              {successMessage && (
                <div className="text-green-500 mb-4">{successMessage}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => dispatch(setEmail(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#4D2D61] focus:border-transparent outline-none transition"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || buttonDisabled}
                  className="w-full bg-[#4D2D61] hover:bg-[#57356A] text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                >
                  {loading || buttonDisabled ? "Sending..." : "Send code"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Side - Logo and Illustration */}
        <div className="hidden lg:block w-full lg:w-1/2 pr-12 mb-8 lg:mb-0">
          <div className="flex flex-col items-center space-y-6">
            <img
              src="src/assets/bro.png"
              alt="Reset Password Illustration"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;

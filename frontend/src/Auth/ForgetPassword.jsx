import { useState } from "react";
import { useNavigate } from "react-router-dom";


function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      const response = await fetch("/api/v1/users/forgotPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset code");
      }

      if (data.status === "success") {
        setSuccessMessage(data.message);
        navigate("/verification", { state: { email } });
      }
    } catch (error) {
      setError(error.message || "Something went wrong. Please try again later.");
    }
  };

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
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#4D2D61] focus:border-transparent outline-none transition"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#4D2D61] hover:bg-[#57356A] text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                >
                  Send code
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
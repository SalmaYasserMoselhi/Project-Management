import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import coloredLogo from "../assets/coloredLogoWithWordBeside.png";

export default function VerificationFailed() {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate("/login"); // You can redirect to login if you prefer
  };

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { type: "spring", duration: 1.5, bounce: 0 },
        opacity: { duration: 0.3 }
      }
    }
  };

  const circleVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <motion.div
        className="mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img
          src={coloredLogo}
          alt="Logo"
          style={{ width: "180px", height: "80px" }}
        />
      </motion.div>

      <motion.div
        className="bg-white rounded-lg shadow-md border border-gray-200 p-8 w-full max-w-md flex flex-col items-center"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        {/* Red X icon */}
        <motion.div
          className="relative w-16 h-16 mb-6"
          initial="hidden"
          animate="visible"
          variants={circleVariants}
        >
          <div className="absolute inset-0 bg-red-600 rounded-full"></div>

          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="absolute inset-0 w-full h-full"
            strokeWidth="3"
            stroke="white"
            fill="none"
            initial="hidden"
            animate="visible"
          >
            <motion.path
              d="M6 6L18 18M6 18L18 6"
              variants={pathVariants}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.div>

        <motion.h1
          className="text-2xl font-bold mb-4 text-gray-900"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          Verification Failed
        </motion.h1>

        <motion.div
          className="text-center space-y-2 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.4 }}
        >
          <p className="text-gray-600">
            We couldn't verify your email address.
          </p>
          <p className="text-gray-600">
            Please check the verification link or try signing in again.
          </p>
        </motion.div>

        <motion.button
          className="w-full bg-red-600 text-white py-3 rounded-md hover:bg-red-700 transition-colors font-medium"
          onClick={handleRedirect}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Sign in
        </motion.button>
      </motion.div>
    </div>
  );
}

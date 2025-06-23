import { memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

/**
 * ConfirmationDialog Component
 *
 * Features:
 * - Fully responsive design (mobile, tablet, desktop)
 * - Clean white background throughout
 * - Smooth animations and interactions
 * - Custom styled buttons with gradients
 */

const ConfirmationDialog = memo(
  ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmation",
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "danger", // danger, warning, info
    icon: CustomIcon,
  }) => {
    // Handle ESC key
    useEffect(() => {
      const handleEsc = (e) => {
        if (e.key === "Escape" && isOpen) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          onClose(e);
        }
      };

      if (isOpen) {
        document.addEventListener("keydown", handleEsc);
      }

      return () => {
        document.removeEventListener("keydown", handleEsc);
      };
    }, [isOpen, onClose]);

    const getColors = () => {
      switch (type) {
        case "danger":
          return {
            gradient: "from-[#4d2d61] to-[#7b4397]",
            hoverGradient: "from-[#4d2d61] to-[#7b4397]",
            iconColor: "text-[#4d2d61]",
            bgColor: "bg-[#4d2d61]/5",
            borderColor: "border-[#4d2d61]/10",
          };
        case "warning":
          return {
            gradient: "from-yellow-500 to-orange-500",
            hoverGradient: "from-yellow-600 to-orange-600",
            iconColor: "text-yellow-500",
            bgColor: "bg-yellow-50",
            borderColor: "border-yellow-100",
          };
        default:
          return {
            gradient: "from-[#4d2d61] to-[#7b4397]",
            hoverGradient: "from-[#4d2d61] to-[#7b4397]",
            iconColor: "text-[#4d2d61]",
            bgColor: "bg-[#4d2d61]/5",
            borderColor: "border-[#4d2d61]/10",
          };
      }
    };

    const colors = getColors();
    const IconComponent = CustomIcon || AlertTriangle;

    if (!isOpen) return null;

    return (
      <AnimatePresence mode="wait">
        {isOpen && (
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={(e) => {
              // Only close if clicking on the backdrop itself, not on any child elements
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent?.stopImmediatePropagation?.();
                onClose(e);
              }
            }}
          >
            {/* Clean backdrop without  */}
            <div
              className="absolute inset-0 "
              onClick={(e) => {
                // Prevent event bubbling to parent components
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent?.stopImmediatePropagation?.();
                onClose(e);
              }}
            />

            {/* Enhanced Dialog - Responsive Design */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className="relative bg-white rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl border border-gray-200 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg overflow-hidden z-10 mx-2 sm:mx-4 md:mx-0"
              style={{
                boxShadow:
                  "0 32px 64px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(229, 231, 235, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
              }}
              onClick={(e) => {
                // Prevent clicks inside dialog from closing it
                e.stopPropagation();
              }}
            >
              {/* Animated Header with White Background */}
              <div className="relative px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-3 sm:pb-4 md:pb-6 bg-white">
                <div className="relative flex items-start gap-2 sm:gap-3 md:gap-4">
                  {/* Enhanced Icon - Responsive */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.2,
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                    }}
                    className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl md:rounded-2xl ${colors.bgColor} ${colors.borderColor} border-2 flex items-center justify-center shadow-lg`}
                  >
                    <IconComponent
                      className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${colors.iconColor}`}
                    />
                  </motion.div>

                  {/* Enhanced Content - Responsive */}
                  <div className="flex-1 min-w-0 pt-1">
                    <motion.h3
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1 sm:mb-2 md:mb-3 tracking-tight"
                    >
                      {title}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-600 text-xs sm:text-sm md:text-base leading-relaxed"
                    >
                      {message}
                    </motion.p>
                  </div>

                  {/* Enhanced Close Button - Responsive */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35, type: "spring", stiffness: 300 }}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent?.stopImmediatePropagation?.();
                      onClose(e);
                    }}
                    className="flex-shrink-0 p-1 sm:p-2 md:p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md sm:rounded-lg md:rounded-xl transition-all duration-200 group"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-transform duration-200 group-hover:rotate-90" />
                  </motion.button>
                </div>
              </div>

              {/* Enhanced Actions - Responsive */}
              <div className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-6 md:pb-8 pt-1 sm:pt-2 bg-white">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {/* Enhanced Cancel Button - Responsive */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent?.stopImmediatePropagation?.();
                      onClose(e);
                    }}
                    className="w-full sm:flex-1 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg sm:rounded-xl md:rounded-2xl transition-all duration-300 border border-gray-200/50 hover:border-gray-300/50 text-xs sm:text-sm md:text-base"
                  >
                    {cancelText}
                  </motion.button>

                  {/* Enhanced Confirm Button - Responsive */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 12px 30px rgba(0, 0, 0, 0.2)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent?.stopImmediatePropagation?.();
                      onConfirm(e);
                      onClose(e);
                    }}
                    className={`w-full sm:flex-1 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-3.5 bg-gradient-to-r ${colors.gradient} hover:${colors.hoverGradient} text-white font-semibold rounded-lg sm:rounded-xl md:rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl relative overflow-hidden group text-xs sm:text-sm md:text-base`}
                  >
                    <span className="relative z-10">{confirmText}</span>
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </motion.button>
                </div>
              </div>

              {/* Clean white background border */}
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl md:rounded-3xl border border-gray-200 pointer-events-none" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
);

ConfirmationDialog.displayName = "ConfirmationDialog";

export default ConfirmationDialog;

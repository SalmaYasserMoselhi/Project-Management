import { memo, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

/**
 * DeleteConfirmationDialog Component
 *
 * A reusable confirmation dialog for delete operations that matches the app's design
 * Features:
 * - Fully responsive design
 * - Smooth animations
 * - Custom styled buttons with gradients
 * - ESC key support
 * - Click outside to close
 */

const DeleteConfirmationDialog = memo(
  ({
    isOpen,
    onClose,
    onConfirm,
    title = "Delete Confirmation",
    message,
    itemName = "",
    itemType = "item", // "card", "list", "board", etc.
    confirmText = "Delete",
    cancelText = "Cancel",
    loading = false,
  }) => {
    // Handle ESC key
    useEffect(() => {
      const handleEsc = (e) => {
        if (e.key === "Escape" && isOpen) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener("keydown", handleEsc);
      }

      return () => {
        document.removeEventListener("keydown", handleEsc);
      };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const dialog = (
      <AnimatePresence mode="wait">
        {isOpen && (
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }
            }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
            />
            {/* Dialog */}
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
              className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg overflow-hidden z-10 mx-2 sm:mx-4 md:mx-0"
              style={{
                boxShadow:
                  "0 32px 64px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(229, 231, 235, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {/* Header */}
              <div className="relative px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-3 sm:pb-4 md:pb-6 bg-white">
                <div className="relative flex items-start gap-2 sm:gap-3 md:gap-4">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.2,
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                    }}
                    className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl md:rounded-2xl bg-red-50 border-2 border-red-100 flex items-center justify-center shadow-lg"
                  >
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-red-600" />
                  </motion.div>
                  {/* Content */}
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
                      This action cannot be undone
                    </motion.p>
                  </div>
                  {/* Close Button */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35, type: "spring", stiffness: 300 }}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onClose();
                    }}
                    className="flex-shrink-0 p-1 sm:p-2 md:p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md sm:rounded-lg md:rounded-xl transition-all duration-200 group"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-transform duration-200 group-hover:rotate-90" />
                  </motion.button>
                </div>
              </div>
              {/* Message */}
              <div className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-6 md:pb-8 pt-1 sm:pt-2 bg-white">
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-700 text-sm sm:text-base leading-relaxed mb-6"
                >
                  {message ||
                    `Are you sure you want to permanently delete "${itemName}"?`}
                </motion.p>
                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {/* Cancel Button */}
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
                      onClose();
                    }}
                    disabled={loading}
                    className="w-full sm:flex-1 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg sm:rounded-xl md:rounded-2xl transition-all duration-300 border border-gray-200/50 hover:border-gray-300/50 text-xs sm:text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelText}
                  </motion.button>
                  {/* Delete Button */}
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
                      onConfirm();
                    }}
                    disabled={loading}
                    className="w-full sm:flex-1 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-3.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-lg sm:rounded-xl md:rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl relative overflow-hidden group text-xs sm:text-sm md:text-base disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10">
                      {loading ? "Deleting..." : confirmText}
                    </span>
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </motion.button>
                </div>
              </div>
              {/* Clean white background border */}
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl border border-gray-200 pointer-events-none" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );

    return ReactDOM.createPortal(dialog, document.body);
  }
);

DeleteConfirmationDialog.displayName = "DeleteConfirmationDialog";

export default DeleteConfirmationDialog;

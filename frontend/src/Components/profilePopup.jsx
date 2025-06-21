"use client";

import { useRef, useEffect } from "react";
import { X, Upload, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../features/Slice/authSlice/loginSlice";
import { fetchUserData } from "../features/Slice/userSlice/userSlice";
import {
  openPopup,
  closePopup,
  setFormData,
  setPasswordData,
  setValidationErrors,
  clearValidationErrors,
  togglePasswordVisibility,
  setShowDeleteConfirm,
  clearMessages,
  setSuccessMessage,
  resetForm,
  updateProfile,
  updatePassword,
  updateAvatar,
  deleteAccount,
} from "../features/Slice/userSlice/profilePopupSlice";

const passwordEyeCss = `
input[type='password']::-webkit-input-password-toggle-button,
input[type='password']::-ms-reveal,
input[type='password']::-ms-clear {
  display: none !important;
}
`;

const ProfilePopup = ({ user }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const popupRef = useRef(null);

  const {
    isOpen,
    loading,
    error,
    successMessage,
    validationErrors,
    formData,
    passwordData,
    showPasswords,
    showDeleteConfirm,
  } = useSelector((state) => state.profilePopup);

  useEffect(() => {
    if (user) {
      dispatch(resetForm(user));
    }
  }, [user, dispatch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showDeleteConfirm &&
        event.target.closest &&
        event.target.closest(".delete-confirm-modal")
      ) {
        return;
      }
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        dispatch(closePopup());
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, showDeleteConfirm, dispatch]);

  const handleInputChange = (field, value) => {
    dispatch(setFormData({ [field]: value }));

    // Username validation on change
    if (field === "username") {
      if (!value || value.includes(" ")) {
        // Error handling is now managed in the slice
      }
    }
  };

  const handlePasswordChange = (field, value) => {
    dispatch(clearMessages());
    dispatch(setPasswordData({ [field]: value }));

    // Real-time validation for current password (basic validation only)
    if (field === "currentPassword") {
      if (value.length > 0 && value.length < 8) {
        dispatch(
          setValidationErrors({
            currentPassword: "Password must be at least 8 characters",
          })
        );
      } else {
        // Clear error for current password (real validation will happen on save)
        dispatch(setValidationErrors({ currentPassword: null }));
      }
    }

    // Real-time validation for confirm password
    if (field === "confirmPassword" || field === "newPassword") {
      const currentNewPassword =
        field === "newPassword" ? value : passwordData.newPassword;
      const currentConfirmPassword =
        field === "confirmPassword" ? value : passwordData.confirmPassword;

      if (
        currentNewPassword &&
        currentConfirmPassword &&
        currentNewPassword !== currentConfirmPassword
      ) {
        dispatch(
          setValidationErrors({ confirmPassword: "Passwords do not match" })
        );
      } else {
        dispatch(setValidationErrors({ confirmPassword: null }));
      }
    }
  };

  const handleChangeProfile = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataToSend = new FormData();
    formDataToSend.append("avatar", file);
    formDataToSend.append("firstName", formData.firstName);
    formDataToSend.append("lastName", formData.lastName);
    formDataToSend.append("username", formData.username);
    formDataToSend.append("email", formData.email);

    await dispatch(updateAvatar(formDataToSend));
    await dispatch(fetchUserData());
  };

  const validatePasswordChange = () => {
    const newErrors = {};
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword)
        newErrors.currentPassword = "Current password is required";
      if (!newPassword) newErrors.newPassword = "New password is required";
      else if (newPassword.length < 8)
        newErrors.newPassword = "Password must be at least 8 characters long";
      if (!confirmPassword)
        newErrors.confirmPassword = "Please confirm your new password";
      if (newPassword && confirmPassword && newPassword !== confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
    }
    return newErrors;
  };

  const validateUsername = (username) => {
    if (!username) return "Username is required";
    if (username.includes(" ")) return "Username should not contain spaces";
    return null;
  };

  const handleSave = async () => {
    dispatch(clearMessages());
    dispatch(clearValidationErrors());

    // Check if passwords match before validation
    if (
      passwordData.newPassword &&
      passwordData.confirmPassword &&
      passwordData.newPassword !== passwordData.confirmPassword
    ) {
      dispatch(
        setValidationErrors({ confirmPassword: "Passwords do not match" })
      );
      return;
    }

    // Username validation
    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      return;
    }

    // Password validation
    const passwordErrors = validatePasswordChange();
    if (Object.keys(passwordErrors).length > 0) {
      dispatch(setValidationErrors(passwordErrors));
      return;
    }

    let isPasswordBeingUpdated = false;

    // Check if password is being updated
    if (
      passwordData.currentPassword &&
      passwordData.newPassword &&
      passwordData.confirmPassword
    ) {
      isPasswordBeingUpdated = true;
    }

    // Update profile
    const updateData = {};
    if (formData.firstName) updateData.firstName = formData.firstName;
    if (formData.lastName) updateData.lastName = formData.lastName;
    if (formData.email) updateData.email = formData.email;
    if (formData.username) updateData.username = formData.username;

    let profileUpdateSuccessful = false;

    // Update profile first
    if (Object.keys(updateData).length > 0) {
      const profileResult = await dispatch(updateProfile(updateData));
      if (profileResult.type === updateProfile.fulfilled.type) {
        await dispatch(fetchUserData());
        profileUpdateSuccessful = true;
      } else {
        // Profile update failed, don't proceed
        return;
      }
    }

    // Update password if needed
    if (isPasswordBeingUpdated) {
      const passwordResult = await dispatch(updatePassword(passwordData));
      if (passwordResult.type === updatePassword.fulfilled.type) {
        // Password update successful - show success message then redirect
        setTimeout(() => {
          // Close popup first
          dispatch(closePopup());
          localStorage.removeItem("token");
          localStorage.removeItem("selectedPublicWorkspace");
          dispatch(logoutUser());
          navigate("/login", { replace: true });
        }, 2000);
      } else if (passwordResult.type === updatePassword.rejected.type) {
        // Handle password update errors - likely incorrect current password
        const errorMessage = passwordResult.payload;
        if (
          errorMessage &&
          errorMessage.toLowerCase().includes("current password")
        ) {
          dispatch(
            setValidationErrors({
              currentPassword: "Incorrect current password",
            })
          );
        }
        return; // Don't show profile success if password failed
      }
    } else if (profileUpdateSuccessful) {
      // Only profile was updated (no password), show profile success and close popup
      dispatch(setSuccessMessage("Profile updated successfully!"));
      setTimeout(() => {
        dispatch(closePopup());
      }, 1500);
    }
  };

  const handleDeleteAccount = async () => {
    const result = await dispatch(deleteAccount());
    if (result.type === deleteAccount.fulfilled.type) {
      localStorage.removeItem("token");
      localStorage.removeItem("selectedPublicWorkspace");
      await dispatch(logoutUser());
      navigate("/signup", { replace: true });
    }
  };

  const handleCancel = () => {
    dispatch(resetForm(user));
    dispatch(closePopup());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-[0.75px] flex items-center justify-center z-50 p-3">
      <style>{passwordEyeCss}</style>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div
        ref={popupRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto border border-gray-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-[#4d2d61] to-[#7b4397]">
          <h2 className="text-xl font-bold text-white">Profile</h2>
          <button
            onClick={() => dispatch(closePopup())}
            className="p-1.5 hover:bg-white/20 rounded-full transition-all duration-200"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        <div className="p-3">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-md flex items-center space-x-2">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-green-700 text-sm font-medium">
                {successMessage}
              </span>
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2 text-red-700 text-sm">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Profile Section */}
          <div className="flex items-center justify-between mb-4 p-2 bg-gradient-to-r from-[#4d2d61]/10 to-[#7b4397]/10 rounded-lg border border-purple-100">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={user?.avatar || ""}
                  onError={(e) => {
                    e.target.onerror = null; // Prevent infinite loops
                    const name = user.username || user.email || "User";
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      name
                    )}&background=4D2D61&color=fff&bold=true&size=128`;
                  }}
                  alt="Profile"
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                />
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full ${
                    user?.status === "online" ? "bg-green-500" : "bg-gray-400"
                  }`}
                ></div>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  {formData.firstName} {formData.lastName}
                </h3>
                <p className="text-gray-600 text-xs">{formData.email}</p>
                <p className="text-[#7b4397] text-xs font-medium">
                  @{formData.username}
                </p>
              </div>
            </div>
            <div className="flex space-x-1.5">
              <button
                onClick={handleChangeProfile}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white rounded-md hover:from-[#4d2d61]/90 hover:to-[#7b4397]/90 transition-all duration-200 shadow-sm text-xs"
              >
                <Upload size={12} />
                <span className="font-medium">Change</span>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7b4397] focus:border-[#7b4397] transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7b4397] focus:border-[#7b4397] transition-all duration-200"
                />
              </div>
            </div>

            {/* Username & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#7b4397] focus:border-[#7b4397] transition-all duration-200 ${
                    error?.username ? "border-red-300" : "border-gray-200"
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7b4397] focus:border-[#7b4397] transition-all duration-200"
                />
              </div>
            </div>

            {/* Change Password Section */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-800">
                  Change Password
                </h3>
              </div>

              <div className="space-y-2 bg-gradient-to-r from-[#4d2d61]/5 to-[#7b4397]/5 p-2 rounded-lg border border-purple-100">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        handlePasswordChange("currentPassword", e.target.value)
                      }
                      autoComplete="new-password"
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#7b4397] focus:border-[#7b4397] pr-8 bg-white transition-all duration-200 ${
                        validationErrors?.currentPassword
                          ? "border-red-300"
                          : "border-gray-200"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        dispatch(togglePasswordVisibility("current"))
                      }
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#7b4397] transition-colors duration-200"
                      tabIndex={-1}
                    >
                      {showPasswords.current ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  {validationErrors?.currentPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {validationErrors.currentPassword}
                    </p>
                  )}
                </div>

                {/* New Password & Confirm Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          handlePasswordChange("newPassword", e.target.value)
                        }
                        autoComplete="new-password"
                        className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#7b4397] focus:border-[#7b4397] pr-8 bg-white transition-all duration-200 ${
                          validationErrors?.newPassword
                            ? "border-red-300"
                            : "border-gray-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          dispatch(togglePasswordVisibility("new"))
                        }
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#7b4397] transition-colors duration-200"
                        tabIndex={-1}
                      >
                        {showPasswords.new ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    {validationErrors?.newPassword && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.newPassword}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          handlePasswordChange(
                            "confirmPassword",
                            e.target.value
                          )
                        }
                        autoComplete="new-password"
                        className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#7b4397] focus:border-[#7b4397] pr-8 bg-white transition-all duration-200 ${
                          validationErrors?.confirmPassword
                            ? "border-red-300"
                            : "border-gray-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          dispatch(togglePasswordVisibility("confirm"))
                        }
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#7b4397] transition-colors duration-200"
                        tabIndex={-1}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    {validationErrors?.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">
                        {validationErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Delete Account Section */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-800">
                  Delete Account
                </h3>
              </div>

              <div className="bg-red-50 border border-red-200 p-2 rounded-lg">
                <p className="text-red-700 text-sm mb-3">
                  This will permanently delete your account and remove all your
                  data.
                </p>
                <button
                  onClick={() => dispatch(setShowDeleteConfirm(true))}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all duration-200 font-semibold text-sm"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                loading ||
                (passwordData.newPassword &&
                  passwordData.confirmPassword &&
                  passwordData.newPassword !== passwordData.confirmPassword)
              }
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#4d2d61] to-[#7b4397] text-white rounded-md hover:from-[#4d2d61]/90 hover:to-[#7b4397]/90 transition-all duration-200 font-semibold shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-3">
          <div className="delete-confirm-modal bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Delete Account
                </h3>
                <p className="text-gray-600 text-sm">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete your account? This will
              permanently remove all your data, workspaces, and projects.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => dispatch(setShowDeleteConfirm(false))}
                disabled={loading}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-all duration-200 font-semibold text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all duration-200 font-semibold text-sm disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePopup;

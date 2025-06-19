"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import axios from "../utils/axiosConfig";
import { useDispatch } from "react-redux";
import { fetchUserData } from "../features/Slice/userSlice/userSlice";
import { logoutUser } from "../features/Slice/authSlice/loginSlice";
import { useNavigate } from "react-router-dom";

const passwordEyeCss = `
input[type='password']::-webkit-input-password-toggle-button,
input[type='password']::-ms-reveal,
input[type='password']::-ms-clear {
  display: none !important;
}
`;

const ProfilePopup = ({ isOpen, onClose, user }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    avatar: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const popupRef = useRef(null);
  const fileInputRef = useRef();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const fullName = user.fullName || "";
      const nameParts = fullName.split(" ");
      setFormData({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        username: user.username || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [user]);

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
        onClose();
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
  }, [isOpen, onClose, showDeleteConfirm]);

  const clearMessages = () => {
    setErrors({});
    setSuccessMessage("");
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Username validation on change
    if (field === "username") {
      if (!value) {
        setErrors((prev) => ({ ...prev, username: "Username is required" }));
      } else if (value.includes(" ")) {
        setErrors((prev) => ({
          ...prev,
          username: "Username should not contain spaces",
        }));
      } else {
        setErrors((prev) => {
          const { username, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handlePasswordChange = (field, value) => {
    clearMessages();
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleChangeProfile = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setErrors({});
    setSuccessMessage("");
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("avatar", file);
      formDataToSend.append("firstName", formData.firstName);
      formDataToSend.append("lastName", formData.lastName);
      formDataToSend.append("username", formData.username);
      formDataToSend.append("email", formData.email);
      const response = await axios.patch(
        "/api/v1/users/updateMe",
        formDataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (response.data.status === "success") {
        setSuccessMessage("Profile photo updated!");
        if (response.data.data.user.avatar) {
          setFormData((prev) => ({
            ...prev,
            avatar: response.data.data.user.avatar,
          }));
        }
        await dispatch(fetchUserData());
      }
    } catch (error) {
      setErrors({ profile: "Failed to update profile photo" });
    } finally {
      setLoading(false);
    }
  };

  const validatePasswordChange = () => {
    const newErrors = {};
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    // Only validate if any password field is filled
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

  const updateProfile = async () => {
    try {
      setLoading(true);
      clearMessages();

      // Username validation
      const usernameError = validateUsername(formData.username);
      if (usernameError) {
        setErrors({ username: usernameError });
        setLoading(false);
        return;
      }

      const updateData = {};
      if (formData.firstName) updateData.firstName = formData.firstName;
      if (formData.lastName) updateData.lastName = formData.lastName;
      if (formData.email) updateData.email = formData.email;
      if (formData.username) updateData.username = formData.username;
      if (Object.keys(updateData).length === 0) {
        setLoading(false);
        return;
      }
      const response = await axios.patch("/api/v1/users/updateMe", updateData);
      if (response.data.status === "success") {
        setSuccessMessage("Profile updated successfully!");
        await dispatch(fetchUserData());
        onClose();
      }
    } catch (error) {
      console.error("Profile update error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update profile";
      setErrors({ profile: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    try {
      setLoading(true);
      clearMessages();

      const passwordErrors = validatePasswordChange();
      if (Object.keys(passwordErrors).length > 0) {
        setErrors(passwordErrors);
        return;
      }

      if (
        !passwordData.currentPassword ||
        !passwordData.newPassword ||
        !passwordData.confirmPassword
      ) {
        return; // No password change requested
      }

      const response = await axios.patch("/api/v1/users/updateMyPassword", {
        passwordCurrent: passwordData.currentPassword,
        password: passwordData.newPassword,
        passwordConfirm: passwordData.confirmPassword,
      });

      if (response.data.status === "success") {
        setSuccessMessage("Password updated successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      console.error("Password update error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update password";
      setErrors({ password: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setErrors({});
    setSuccessMessage("");
    let hasError = false;

    // Username validation (live, but double-check on save)
    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      setErrors((prev) => ({ ...prev, username: usernameError }));
      hasError = true;
    }

    // Password validation
    const passwordErrors = validatePasswordChange();
    if (Object.keys(passwordErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...passwordErrors }));
      hasError = true;
    }

    if (hasError) return;

    // Update profile first
    let profileSuccess = false;
    try {
      const updateData = {};
      if (formData.firstName) updateData.firstName = formData.firstName;
      if (formData.lastName) updateData.lastName = formData.lastName;
      if (formData.email) updateData.email = formData.email;
      if (formData.username) updateData.username = formData.username;
      if (Object.keys(updateData).length > 0) {
        const response = await axios.patch(
          "/api/v1/users/updateMe",
          updateData
        );
        if (response.data.status === "success") {
          profileSuccess = true;
          setSuccessMessage("Profile updated successfully!");
          await dispatch(fetchUserData());
        }
      } else {
        profileSuccess = true; // No profile changes, treat as success
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to update profile";
      setErrors((prev) => ({ ...prev, profile: errorMessage }));
      return;
    }

    // If password fields are filled, update password
    if (
      passwordData.currentPassword ||
      passwordData.newPassword ||
      passwordData.confirmPassword
    ) {
      try {
        const response = await axios.patch("/api/v1/users/updateMyPassword", {
          passwordCurrent: passwordData.currentPassword,
          password: passwordData.newPassword,
          passwordConfirm: passwordData.confirmPassword,
        });
        if (response.data.status === "success") {
          setSuccessMessage("Password updated successfully!");
          setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Failed to update password";
        setErrors((prev) => ({ ...prev, password: errorMessage }));
        return;
      }
    }

    // Only close if everything succeeded
    onClose();
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      clearMessages();

      const response = await axios.delete("/api/v1/users/deleteMe", {
        withCredentials: true,
      });

      if (response.status === 200) {
        setSuccessMessage("Account deleted successfully!");
        // امسح بيانات المستخدم من localStorage
        localStorage.removeItem("token");
        localStorage.removeItem("selectedPublicWorkspace");
        // Logout من الريدكس
        await dispatch(logoutUser());
        // Redirect مباشرة
        navigate("/signup", { replace: true });
      }
    } catch (error) {
      console.error("Account deletion error:", error);
      let errorMessage =
        error.response?.data?.message || "Failed to delete account";
      if (error.response?.status === 401) {
        errorMessage =
          "تم حذف الحساب بالفعل أو انتهت الجلسة. برجاء إنشاء حساب جديد.";
        // امسح بيانات المستخدم ووجهه للساين اب
        localStorage.removeItem("token");
        localStorage.removeItem("selectedPublicWorkspace");
        await dispatch(logoutUser());
        navigate("/signup", { replace: true });
        return;
      }
      setErrors({ delete: errorMessage });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    if (user) {
      const fullName = user.fullName || "";
      const nameParts = fullName.split(" ");
      setFormData({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        username: user.username || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
    }
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    clearMessages();
    onClose();
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
            onClick={onClose}
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
          {Object.keys(errors).length > 0 && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md">
              {Object.entries(errors).map(([key, message]) => (
                <div
                  key={key}
                  className="flex items-center space-x-2 text-red-700 text-sm"
                >
                  <AlertCircle size={14} />
                  <span>{message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Profile Section */}
          <div className="flex items-center justify-between mb-4 p-2 bg-gradient-to-r from-[#4d2d61]/10 to-[#7b4397]/10 rounded-lg border border-purple-100">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={
                    formData.avatar
                      ? formData.avatar
                      : user?.avatar && user.avatar !== "default.jpg"
                      ? user.avatar
                      : "/Project-Management-main/frontend/src/assets/defaultAvatar.png"
                  }
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
                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#7b4397] focus:border-[#7b4397] transition-all duration-200 ${
                    errors.username ? "border-red-300" : "border-gray-200"
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
                        errors.currentPassword
                          ? "border-red-300"
                          : "border-gray-200"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("current")}
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
                          errors.newPassword
                            ? "border-red-300"
                            : "border-gray-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("new")}
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
                          errors.confirmPassword
                            ? "border-red-300"
                            : "border-gray-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("confirm")}
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
                  onClick={() => setShowDeleteConfirm(true)}
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
              disabled={loading}
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
                onClick={() => setShowDeleteConfirm(false)}
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

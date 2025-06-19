import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../../utils/axiosConfig";

// Async thunk for updating profile
export const updateProfile = createAsyncThunk(
  "profilePopup/updateProfile",
  async (updateData, { rejectWithValue }) => {
    try {
      const response = await axios.patch("/api/v1/users/updateMe", updateData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update profile"
      );
    }
  }
);

// Async thunk for updating password
export const updatePassword = createAsyncThunk(
  "profilePopup/updatePassword",
  async (passwordData, { rejectWithValue }) => {
    try {
      const response = await axios.patch("/api/v1/users/updateMyPassword", {
        passwordCurrent: passwordData.currentPassword,
        password: passwordData.newPassword,
        passwordConfirm: passwordData.confirmPassword,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update password"
      );
    }
  }
);

// Async thunk for updating avatar
export const updateAvatar = createAsyncThunk(
  "profilePopup/updateAvatar",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.patch("/api/v1/users/updateMe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update avatar"
      );
    }
  }
);

// Async thunk for deleting account
export const deleteAccount = createAsyncThunk(
  "profilePopup/deleteAccount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.delete("/api/v1/users/deleteMe", {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete account"
      );
    }
  }
);

const initialState = {
  isOpen: false,
  loading: false,
  error: null,
  successMessage: "",
  formData: {
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    avatar: "",
  },
  passwordData: {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  },
  showPasswords: {
    current: false,
    new: false,
    confirm: false,
  },
  showDeleteConfirm: false,
};

const profilePopupSlice = createSlice({
  name: "profilePopup",
  initialState,
  reducers: {
    openPopup: (state) => {
      state.isOpen = true;
    },
    closePopup: (state) => {
      state.isOpen = false;
      state.error = null;
      state.successMessage = "";
    },
    setFormData: (state, action) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    setPasswordData: (state, action) => {
      state.passwordData = { ...state.passwordData, ...action.payload };
    },
    togglePasswordVisibility: (state, action) => {
      state.showPasswords[action.payload] =
        !state.showPasswords[action.payload];
    },
    setShowDeleteConfirm: (state, action) => {
      state.showDeleteConfirm = action.payload;
    },
    clearMessages: (state) => {
      state.error = null;
      state.successMessage = "";
    },
    resetForm: (state, action) => {
      const user = action.payload;
      if (user) {
        const fullName = user.fullName || "";
        const nameParts = fullName.split(" ");
        state.formData = {
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          username: user.username || "",
          email: user.email || "",
          avatar: user.avatar || "",
        };
      }
      state.passwordData = {
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      };
      state.error = null;
      state.successMessage = "";
    },
  },
  extraReducers: (builder) => {
    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = "Profile updated successfully!";
        state.isOpen = false;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Password
    builder
      .addCase(updatePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePassword.fulfilled, (state) => {
        state.loading = false;
        state.successMessage = "Password updated successfully!";
        state.passwordData = {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        };
      })
      .addCase(updatePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Avatar
    builder
      .addCase(updateAvatar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAvatar.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = "Profile photo updated!";
        if (action.payload.data.user.avatar) {
          state.formData.avatar = action.payload.data.user.avatar;
        }
      })
      .addCase(updateAvatar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Account
    builder
      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.loading = false;
        state.successMessage = "Account deleted successfully!";
        state.showDeleteConfirm = false;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.showDeleteConfirm = false;
      });
  },
});

export const {
  openPopup,
  closePopup,
  setFormData,
  setPasswordData,
  togglePasswordVisibility,
  setShowDeleteConfirm,
  clearMessages,
  resetForm,
} = profilePopupSlice.actions;

export default profilePopupSlice.reducer;

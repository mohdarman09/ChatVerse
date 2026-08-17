import { createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosinstance";

/**
 * Safely extract a user-friendly error message from an Axios error.
 * - API responded with { message }  → use that message
 * - No response (network down / server unreachable) → fixed message
 * - Anything else → generic fallback
 */
const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.request && !error?.response) {
    // Request was made but no response received — server unreachable
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }
  return fallback;
};

export const loginUserThunk = createAsyncThunk("user/login", async ({ username, password }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/login', { username, password });
    return response.data;
  } catch (error) {
    const message = getErrorMessage(error, "Login failed. Please try again.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const registerUserThunk = createAsyncThunk("user/signup", async ({ fullName, username, password, gender, avatar }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/register', {
      fullName, username, password, gender, avatar,
    });
    return response.data;
  } catch (error) {
    const message = getErrorMessage(error, "Registration failed. Please try again.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const logoutUserThunk = createAsyncThunk("user/logout", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/logout');
    return response.data;
  } catch (error) {
    // Fail-open: even if the server is unreachable or returns an error,
    // we still want to clear local auth state. Return a synthetic success
    // so the .fulfilled handler always fires and wipes the Redux store.
    // The server-side cookie may not be cleared in this path, but the client
    // will be in a logged-out state and will not auto-login on next startup
    // (the next getProfile call will fail once the cookie truly expires).
    console.warn("Logout API call failed — clearing local state anyway:", error?.message);
    return { success: true, message: "Logged out locally" };
  }
});

export const getUserProfileThunk = createAsyncThunk("user/get-profile", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get('/user/get-profile')
    return response.data;
  } catch (error) {
    const errorOutput = error?.response?.data?.message
    return rejectWithValue(errorOutput);
  }
});

export const searchUsersThunk = createAsyncThunk("user/search", async (query, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get('/user/search', { params: { query } });
    return response.data;
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || "Search failed");
  }
});

export const updateProfileThunk = createAsyncThunk("user/update-profile", async ({ fullName, username, avatar, removeAvatar }, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('username', username);
    if (removeAvatar) {
      formData.append('removeAvatar', 'true');
    } else if (avatar) {
      formData.append('avatar', avatar);
    }

    const response = await axiosInstance.patch('/user/update-profile', formData, {
      headers: { 'Content-Type': undefined },
    });
    toast.success("Profile updated successfully");
    return response.data;
  } catch (error) {
    const errorOutput = error?.response?.data?.message || "Failed to update profile";
    toast.error(errorOutput);
    return rejectWithValue(errorOutput);
  }
});

export const changePasswordThunk = createAsyncThunk("user/change-password", async ({ currentPassword, newPassword, confirmPassword }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/change-password', {
      currentPassword,
      newPassword,
      confirmPassword
    });
    toast.success("Password changed successfully");
    return response.data;
  } catch (error) {
    const errorOutput = error?.response?.data?.message || "Failed to change password";
    toast.error(errorOutput);
    return rejectWithValue(errorOutput);
  }
});

export const deleteAccountThunk = createAsyncThunk("user/delete-account", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.delete('/user/delete-account');
    return response.data;
  } catch (error) {
    const errorOutput = error?.response?.data?.message || "Failed to delete account";
    toast.error(errorOutput);
    return rejectWithValue(errorOutput);
  }
});

export const getUserByIdThunk = createAsyncThunk("user/get-user-by-id", async ({ userId }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get(`/user/profile/${userId}`);
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    let message = error?.response?.data?.message;
    if (!message) {
      if (status === 400) message = "Invalid user profile";
      else if (status === 404) message = "User not found";
      else if (!error?.response && error?.request) message = "Unable to connect to the server. Please check your connection.";
      else message = "Unable to load profile. Please try again";
    }
    return rejectWithValue({ message, status });
  }
});

export const blockUserThunk = createAsyncThunk("user/block-user", async ({ userId }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post(`/user/block/${userId}`);
    toast.success(response.data?.message || "User blocked");
    return response.data;
  } catch (error) {
    const message = getErrorMessage(error, "Failed to block user");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const unblockUserThunk = createAsyncThunk("user/unblock-user", async ({ userId }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post(`/user/unblock/${userId}`);
    toast.success(response.data?.message || "User unblocked");
    return response.data;
  } catch (error) {
    const message = getErrorMessage(error, "Failed to unblock user");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const getBlockedUsersThunk = createAsyncThunk("user/get-blocked-users", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get('/user/blocked-users');
    return response.data;
  } catch (error) {
    const message = getErrorMessage(error, "Failed to load blocked users");
    return rejectWithValue(message);
  }
});


import { createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosinstance";

export const loginUserThunk = createAsyncThunk("user/login", async ({ usernameOrEmail, password }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/login', {
      usernameOrEmail,
      password
    })
    return response.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    const errorOutput = error?.response?.data?.message
    toast.error(errorOutput)
    return rejectWithValue(errorOutput);
  }
});

export const registerUserThunk = createAsyncThunk("user/signup", async ({ fullName, username, email, password, gender, avatar }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/register', {
      fullName,
      username,
      email,
      password,
      gender,
      avatar,
    })
    return response.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    const errorOutput = error?.response?.data?.message
    toast.error(errorOutput)
    return rejectWithValue(errorOutput);
  }
});

export const verifyOTPThunk = createAsyncThunk("user/verify-otp", async ({ email, otp }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/verify-otp', { email, otp });
    return response.data;
  } catch (error) {
    const errorOutput = error?.response?.data?.message || "OTP verification failed";
    toast.error(errorOutput);
    return rejectWithValue(errorOutput);
  }
});

export const resendOTPThunk = createAsyncThunk("user/resend-otp", async ({ email }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/resend-otp', { email });
    return response.data;
  } catch (error) {
    const errorOutput = error?.response?.data?.message || "Failed to resend OTP";
    toast.error(errorOutput);
    return rejectWithValue(errorOutput);
  }
});

export const forgotPasswordThunk = createAsyncThunk("user/forgot-password", async ({ email }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/forgot-password', { email });
    return response.data;
  } catch (error) {
    const errorOutput = error?.response?.data?.message || "Failed to send OTP";
    toast.error(errorOutput);
    return rejectWithValue(errorOutput);
  }
});

export const resetPasswordThunk = createAsyncThunk("user/reset-password", async ({ email, otp, newPassword, confirmPassword }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/reset-password', { email, otp, newPassword, confirmPassword });
    return response.data;
  } catch (error) {
    const errorOutput = error?.response?.data?.message || "Failed to reset password";
    toast.error(errorOutput);
    return rejectWithValue(errorOutput);
  }
});

export const logoutUserThunk = createAsyncThunk("user/logout", async (_,{ rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/logout')
    return response.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    const errorOutput = error?.response?.data?.message
    toast.error(errorOutput)
    return rejectWithValue(errorOutput);
  }
});

export const getUserProfileThunk = createAsyncThunk("user/get-profile", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get('/user/get-profile')
    return response.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    const errorOutput = error?.response?.data?.message
    return rejectWithValue(errorOutput);
  }
});

export const getOtherUsersThunk = createAsyncThunk("user/getOtherUsers", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get('/user/get-other-users')
    return response.data;
  } catch (error) {
    console.error(error?.response?.data?.message);
    const errorOutput = error?.response?.data?.message
    return rejectWithValue(errorOutput);
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
    console.error(error?.response?.data?.message);
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
    console.error(error?.response?.data?.message);
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
    console.error(error?.response?.data?.message);
    const errorOutput = error?.response?.data?.message || "Failed to delete account";
    toast.error(errorOutput);
    return rejectWithValue(errorOutput);
  }
});

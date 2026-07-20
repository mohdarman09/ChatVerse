import { createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosinstance";

export const loginUserThunk = createAsyncThunk("user/login", async ({ username, password }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/login', {
      username,
      password  
    })
    return response.data;
    toast.success("Login successful")

  } catch (error) {

    console.error(error?.response?.data?.message);

    const errorOutput = error?.response?.data?.message
    toast.error(errorOutput)
    return rejectWithValue(errorOutput);
  }


});


export const registerUserThunk = createAsyncThunk("user/signup", async ({ fullName, username, email, password, gender }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/register', {
      fullName,
      username,
      email,
      password,
      gender
    })
    
    return response.data;
    toast.success("Account created successfully")

  } catch (error) {
    console.error(error?.response?.data?.message);
    const errorOutput = error?.response?.data?.message
    toast.error(errorOutput)
    return rejectWithValue(errorOutput);
  }


});


export const logoutUserThunk = createAsyncThunk("user/logout", async (_,{ rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/logout')
    
    return response.data;
    toast.success("Logout successful")

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
    // toast.error(errorOutput)
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
    // toast.error(errorOutput)
    return rejectWithValue(errorOutput);
  }


});


export const updateProfileThunk = createAsyncThunk("user/update-profile", async ({ fullName, username, avatar }, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('username', username);
    if (avatar) formData.append('avatar', avatar);

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

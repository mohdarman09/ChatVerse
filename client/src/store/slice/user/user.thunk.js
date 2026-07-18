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


export const registerUserThunk = createAsyncThunk("user/signup", async ({ fullName, username, password, gender }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/user/register', {
      fullName,
      username,
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

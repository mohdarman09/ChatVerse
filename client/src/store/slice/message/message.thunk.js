import { createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosinstance";

export const sendMessageThunk = createAsyncThunk("message/send", async ({ recieverId, message, replyTo, image }, { rejectWithValue }) => {
  try {
    let response;
    if (image) {
      const formData = new FormData();
      formData.append('image', image);
      if (message) formData.append('message', message);
      if (replyTo) formData.append('replyTo', JSON.stringify(replyTo));
      response = await axiosInstance.post(`/message/send/${recieverId}`, formData, {
        headers: { 'Content-Type': undefined },
      });
    } else {
      response = await axiosInstance.post(`/message/send/${recieverId}`, {
        message,
        replyTo: replyTo || undefined
      })
    }
    return response.data;

  } catch (error) {
    console.error(error?.response?.data?.message);
    const errorOutput = error?.response?.data?.message || error?.message || "Failed to send message"
    toast.error(errorOutput)
    return rejectWithValue(errorOutput);
  }
});


export const getMessageThunk = createAsyncThunk(
  "message/get",
  async ({ recieverId }, { rejectWithValue }) => {

    const response = await axiosInstance.get(
      `/message/get-messages/${recieverId}`
    );

    return response.data;
  }
);

export const editMessageThunk = createAsyncThunk(
  "message/edit",
  async ({ messageId, message }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/message/edit/${messageId}`, { message });
      return response.data;
    } catch (error) {
      const errorOutput = error?.response?.data?.message
      toast.error(errorOutput)
      return rejectWithValue(errorOutput);
    }
  }
);

export const deleteMessageThunk = createAsyncThunk(
  "message/delete",
  async ({ messageId, deleteForEveryone }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/message/delete/${messageId}`, {
        data: { deleteForEveryone }
      });
      return response.data;
    } catch (error) {
      const errorOutput = error?.response?.data?.message
      toast.error(errorOutput)
      return rejectWithValue(errorOutput);
    }
  }
);

export const reactToMessageThunk = createAsyncThunk(
  "message/react",
  async ({ messageId, emoji }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/message/react/${messageId}`, { emoji });
      return response.data;
    } catch (error) {
      const errorOutput = error?.response?.data?.message
      toast.error(errorOutput)
      return rejectWithValue(errorOutput);
    }
  }
);

export const getConversationsThunk = createAsyncThunk(
  "message/conversations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/message/conversations');
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message);
    }
  }
);

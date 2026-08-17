import { createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";
import { axiosInstance } from "../../../components/utilities/axiosinstance";

export const sendMessageThunk = createAsyncThunk(
  "message/send",
  async (payload, { rejectWithValue }) => {
    try {
      const { recieverId } = payload;
      let response;

      if (payload.formData instanceof FormData) {
        response = await axiosInstance.post(`/message/send/${recieverId}`, payload.formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (payload.image) {
        const formData = new FormData();
        formData.append('image', payload.image);
        const textMsg = payload.message ?? payload.messageData?.message;
        if (textMsg) formData.append('message', textMsg);
        const reply = payload.replyTo ?? payload.messageData?.replyTo;
        if (reply) {
          formData.append('replyTo', typeof reply === 'object' ? JSON.stringify(reply) : reply);
        }
        response = await axiosInstance.post(`/message/send/${recieverId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const textMsg = payload.message ?? payload.messageData?.message;
        const reply = payload.replyTo ?? payload.messageData?.replyTo;
        response = await axiosInstance.post(`/message/send/${recieverId}`, {
          message: textMsg,
          replyTo: reply || undefined,
        });
      }
      return response.data;

    } catch (error) {
      const errorOutput = error?.response?.data?.message || error?.message || "Failed to send message";
      toast.error(errorOutput);
      return rejectWithValue(errorOutput);
    }
  }
);


export const getMessageThunk = createAsyncThunk(
  "message/get",
  async ({ recieverId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/message/get-messages/${recieverId}`
      );
      return response.data;
    } catch (error) {
      const errorOutput = error?.response?.data?.message || error?.message || "Failed to load messages";
      return rejectWithValue(errorOutput);
    }
  }
);

export const loadOlderMessagesThunk = createAsyncThunk(
  "message/loadOlder",
  async ({ recieverId, before }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/message/get-messages/${recieverId}?limit=100&before=${before}`
      );
      return response.data;
    } catch (error) {
      const errorOutput = error?.response?.data?.message || error?.message || "Failed to load older messages";
      return rejectWithValue(errorOutput);
    }
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

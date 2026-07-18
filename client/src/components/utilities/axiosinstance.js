import axios from "axios";

const BD_URL = import.meta.env.VITE_DB_URL;

export const axiosInstance = axios.create({
  baseURL: BD_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
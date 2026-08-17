import axios from "axios";

const BD_URL = import.meta.env.VITE_DB_URL;

export const axiosInstance = axios.create({
  baseURL: BD_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let storeRef = null;

/**
 * Injects the Redux store into the axios instance.
 * Called during app startup (in main.jsx) to avoid circular module dependencies
 * between store -> user.slice -> user.thunk -> axiosinstance -> store.
 */
export const injectStore = (store) => {
  storeRef = store;
};

// 401 response interceptor.
// When any protected API call returns 401 (session expired, user deleted, or
// invalid token), automatically clear all client-side auth state so the app
// returns to the logged-out state. The ProtectedRoute will then redirect to
// the Login page.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (storeRef) {
        storeRef.dispatch({ type: "user/resetAuthState" });
      }
    }
    return Promise.reject(error);
  }
);
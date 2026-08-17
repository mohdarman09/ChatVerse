import { createSlice } from "@reduxjs/toolkit";
import { getUserProfileThunk, loginUserThunk, logoutUserThunk, registerUserThunk, updateProfileThunk, changePasswordThunk, deleteAccountThunk } from "./user.thunk";

const getInitialSelectedUser = () => {
  try {
    const item = localStorage.getItem("selectedUser");
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

export const userSlice = createSlice({
  name: "user",
  initialState: {
    isAuthenticated: false,
    userProfile: null,
    selectedUser: getInitialSelectedUser(),
    buttonLoading: false,
    screenLoading: true,
    lastSeenMap: {},
  },
  reducers: {
    setSelectedUser: (state, action) => {
      localStorage.setItem("selectedUser", JSON.stringify(action.payload));
      state.selectedUser = action.payload;
    },
    setUserLastSeen: (state, action) => {
      const { userId, lastSeen } = action.payload;
      state.lastSeenMap[userId] = lastSeen;
    },
    // Called by the axios 401 interceptor and by logout/delete thunks.
    // Completely wipes all auth state so the app returns to logged-out state
    // regardless of where in the app the 401 was received.
    resetAuthState: (state) => {
      state.isAuthenticated = false;
      state.userProfile = null;
      state.selectedUser = null;
      state.buttonLoading = false;
      state.screenLoading = false;
      state.lastSeenMap = {};
      localStorage.removeItem("selectedUser");
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginUserThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(loginUserThunk.fulfilled, (state, action) => {
      state.userProfile = action.payload?.responseData?.user;
      state.isAuthenticated = true;
      state.buttonLoading = false;
    });
    builder.addCase(loginUserThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(registerUserThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(registerUserThunk.fulfilled, (state, action) => {
      state.userProfile = action.payload?.responseData?.user;
      state.isAuthenticated = true;
      state.buttonLoading = false;
    });
    builder.addCase(registerUserThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(logoutUserThunk.fulfilled, (state) => {
      state.userProfile = null;
      state.selectedUser = null;
      state.isAuthenticated = false;
      state.buttonLoading = false;
      state.screenLoading = false;
      localStorage.removeItem("selectedUser");
    });
    builder.addCase(logoutUserThunk.rejected, (state) => {
      // Even if the server request failed, clear local auth state.
      // The user pressed logout — always honour it on the client.
      state.userProfile = null;
      state.selectedUser = null;
      state.isAuthenticated = false;
      state.buttonLoading = false;
      state.screenLoading = false;
      localStorage.removeItem("selectedUser");
    });

    builder.addCase(getUserProfileThunk.pending, (state) => {
      state.screenLoading = true;
    });
    builder.addCase(getUserProfileThunk.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.screenLoading = false;
      state.userProfile = action.payload?.responseData;
    });
    builder.addCase(getUserProfileThunk.rejected, (state) => {
      state.screenLoading = false;
    });

    builder.addCase(updateProfileThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(updateProfileThunk.fulfilled, (state, action) => {
      state.buttonLoading = false;
      if (state.userProfile?.profile) {
        state.userProfile.profile = action.payload?.responseData?.profile;
      }
    });
    builder.addCase(updateProfileThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(changePasswordThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(changePasswordThunk.fulfilled, (state) => {
      state.buttonLoading = false;
    });
    builder.addCase(changePasswordThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(deleteAccountThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(deleteAccountThunk.fulfilled, (state) => {
      state.userProfile = null;
      state.selectedUser = null;
      state.isAuthenticated = false;
      state.buttonLoading = false;
      state.screenLoading = false;
      localStorage.removeItem("selectedUser");
    });
    builder.addCase(deleteAccountThunk.rejected, (state) => {
      state.buttonLoading = false;
    });
  },
});

export const { setSelectedUser, setUserLastSeen, resetAuthState } = userSlice.actions;

export default userSlice.reducer;

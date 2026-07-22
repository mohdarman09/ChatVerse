import { createSlice } from "@reduxjs/toolkit";
import { getOtherUsersThunk, getUserProfileThunk, loginUserThunk, logoutUserThunk, registerUserThunk, updateProfileThunk, changePasswordThunk, deleteAccountThunk, verifyOTPThunk, forgotPasswordThunk, resetPasswordThunk } from "./user.thunk";

export const userSlice = createSlice({
  name: "user",
  initialState: {
    isAuthenticated: false,
    userProfile: null,
    otherUsers: null,
    selectedUser: JSON.parse(localStorage.getItem("selectedUser")) || null,
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
    setUsersLastSeenMap: (state, action) => {
      state.lastSeenMap = { ...state.lastSeenMap, ...action.payload };
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
    builder.addCase(registerUserThunk.fulfilled, (state) => {
      state.buttonLoading = false;
    });
    builder.addCase(registerUserThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(verifyOTPThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(verifyOTPThunk.fulfilled, (state, action) => {
      state.userProfile = action.payload?.responseData?.user;
      state.isAuthenticated = true;
      state.buttonLoading = false;
    });
    builder.addCase(verifyOTPThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(forgotPasswordThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(forgotPasswordThunk.fulfilled, (state) => {
      state.buttonLoading = false;
    });
    builder.addCase(forgotPasswordThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(resetPasswordThunk.pending, (state) => {
      state.buttonLoading = true;
    });
    builder.addCase(resetPasswordThunk.fulfilled, (state) => {
      state.buttonLoading = false;
    });
    builder.addCase(resetPasswordThunk.rejected, (state) => {
      state.buttonLoading = false;
    });

    builder.addCase(logoutUserThunk.fulfilled, (state) => {
      state.userProfile = null;
      state.selectedUser = null;
      state.otherUsers = null;
      state.isAuthenticated = false;
      state.buttonLoading = false;
      localStorage.removeItem("selectedUser");
    });
    builder.addCase(logoutUserThunk.rejected, (state) => {
      state.buttonLoading = false;
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

    builder.addCase(getOtherUsersThunk.pending, (state) => {
      state.screenLoading = true;
    });
    builder.addCase(getOtherUsersThunk.fulfilled, (state, action) => {
      state.screenLoading = false;
      state.otherUsers = action.payload?.responseData;
    });
    builder.addCase(getOtherUsersThunk.rejected, (state) => {
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
      state.otherUsers = null;
      state.isAuthenticated = false;
      state.buttonLoading = false;
      localStorage.removeItem("selectedUser");
    });
    builder.addCase(deleteAccountThunk.rejected, (state) => {
      state.buttonLoading = false;
    });
  },
});

export const { setSelectedUser, setUserLastSeen, setUsersLastSeenMap } = userSlice.actions;

export default userSlice.reducer;

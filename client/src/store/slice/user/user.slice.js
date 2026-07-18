import { createSlice } from "@reduxjs/toolkit";
import { getOtherUsersThunk, getUserProfileThunk, loginUserThunk, logoutUserThunk, registerUserThunk } from "./user.thunk";

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
    //Login User
  builder.addCase(loginUserThunk.pending, (state, action) => {
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

  //Register User
  builder.addCase(registerUserThunk.pending, (state, action) => {
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

  //Logout User
  builder.addCase(logoutUserThunk.pending, (state, action) => {
  });
  builder.addCase(logoutUserThunk.fulfilled, (state, action) => {
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

  //get user profile
  builder.addCase(getUserProfileThunk.pending, (state, action) => {
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

  //get other users
  builder.addCase(getOtherUsersThunk.pending, (state, action) => {
    state.screenLoading = true;
  });
  builder.addCase(getOtherUsersThunk.fulfilled, (state, action) => {
    state.screenLoading = false;
    state.otherUsers = action.payload?.responseData;
  });
  builder.addCase(getOtherUsersThunk.rejected, (state) => {
    state.screenLoading = false;
  });
},
});

export const { setSelectedUser, setUserLastSeen, setUsersLastSeenMap } = userSlice.actions;

export default userSlice.reducer;

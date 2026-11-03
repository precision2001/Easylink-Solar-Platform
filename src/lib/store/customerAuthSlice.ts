import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const CUSTOMER_AUTH_STORAGE_KEY = "customer_auth_user";

export type CustomerUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  address: string | null;
  role: string;
  emailVerified: boolean;
  /** ISO timestamp. Only `GET /users/me` returns it; the sign-in payload does not. */
  createdAt?: string | null;
};

export type CustomerAuthState = {
  user: CustomerUser | null;
  accessToken: string | null;
};

const initialState: CustomerAuthState = {
  user: null,
  accessToken: null,
};

const customerAuthSlice = createSlice({
  name: "customerAuth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<CustomerUser>) => {
      state.user = action.payload;
    },
    setCustomerSession: (
      state,
      action: PayloadAction<{ user: CustomerUser; accessToken: string }>,
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
    },
    setCustomerAccessToken: (state, action: PayloadAction<string | null>) => {
      state.accessToken = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const { setUser, setCustomerSession, setCustomerAccessToken, clearUser } =
  customerAuthSlice.actions;
export default customerAuthSlice.reducer;

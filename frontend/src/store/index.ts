import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import userReducer from './userSlice';
import roleReducer from './roleSlice';
import dashboardReducer from './dashboardSlice';
import qAgentReducer from './qAgentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    roles: roleReducer,
    dashboard: dashboardReducer,
    qAgent: qAgentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

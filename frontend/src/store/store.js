import { configureStore } from '@reduxjs/toolkit';
import dictionaryReducer from './dictionarySlice';

export const store = configureStore({
  reducer: {
    dictionary: dictionaryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
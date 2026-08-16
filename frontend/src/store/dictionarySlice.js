import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dictionaryService } from '../services/dictionaryService';

export const searchWord = createAsyncThunk(
  'dictionary/searchWord',
  async (query, { rejectWithValue }) => {
    try {
      const result = await dictionaryService.searchWord(query);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getWordDetails = createAsyncThunk(
  'dictionary/getWordDetails',
  async (wordId, { rejectWithValue }) => {
    try {
      const word = await dictionaryService.getWordById(wordId);
      return word;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getSuggestions = createAsyncThunk(
  'dictionary/getSuggestions',
  async (query, { rejectWithValue }) => {
    try {
      return await dictionaryService.getSuggestions(query);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const dictionarySlice = createSlice({
  name: 'dictionary',
  initialState: {
    searchResult: { match: null, suggestions: [], notFound: false },
    searchResults: [],
    currentWord: null,
    suggestions: [],
    isLoading: false,
    error: null,
    searchHistory: [],
  },
  reducers: {
    clearSearch: (state) => {
      state.searchResult = { match: null, suggestions: [], notFound: false };
      state.searchResults = [];
      state.suggestions = [];
    },
    addToHistory: (state, action) => {
      const word = action.payload;
      if (!state.searchHistory.some(item => item.id === word.id)) {
        state.searchHistory.unshift(word);
        if (state.searchHistory.length > 20) state.searchHistory.pop();
      }
    },
    clearHistory: (state) => {
      state.searchHistory = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchWord.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchWord.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResult = action.payload;
      })
      .addCase(searchWord.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(getWordDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getWordDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentWord = action.payload;
      })
      .addCase(getWordDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(getSuggestions.fulfilled, (state, action) => {
        state.suggestions = action.payload;
      });
  },
});

export const { clearSearch, addToHistory, clearHistory } = dictionarySlice.actions;
export default dictionarySlice.reducer;

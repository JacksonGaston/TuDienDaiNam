import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dictionaryService } from '../services/dictionaryService';

export const searchWords = createAsyncThunk(
  'dictionary/searchWords',
  async (query, { rejectWithValue }) => {
    try {
      const results = await dictionaryService.searchWords(query);
      return results;
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
      const suggestions = await dictionaryService.getSuggestions(query);
      return suggestions;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const dictionarySlice = createSlice({
  name: 'dictionary',
  initialState: {
    searchResults: [],
    currentWord: null,
    suggestions: [],
    isLoading: false,
    error: null,
    searchHistory: [],
  },
  reducers: {
    clearSearch: (state) => {
      state.searchResults = [];
      state.suggestions = [];
    },
    addToHistory: (state, action) => {
      const word = action.payload;
      if (!state.searchHistory.some(item => item.id === word.id)) {
        state.searchHistory.unshift(word);
        if (state.searchHistory.length > 20) {
          state.searchHistory.pop();
        }
      }
    },
    clearHistory: (state) => {
      state.searchHistory = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchWords.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchWords.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchWords.rejected, (state, action) => {
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
      .addCase(getSuggestions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getSuggestions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.suggestions = action.payload;
      })
      .addCase(getSuggestions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSearch, addToHistory, clearHistory } = dictionarySlice.actions;
export default dictionarySlice.reducer;
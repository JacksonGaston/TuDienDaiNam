# Dictionary Data Directory

This directory contains the text dictionary files used to generate the SQLite database for the TuDienDaiNam mobile app.

## File Format

Place your Dainamese dictionary text files in this directory with the following format:

### Text File Structure
```
word [pronunciation] (word_type). definition

Examples:
hello [həˈloʊ] (interjection). A greeting used when meeting someone.
dictionary [ˈdɪkʃəˌnɛri] (noun). A reference work containing words and their meanings.
```

### Supported Fields
- **word**: The dictionary entry word (required)
- **pronunciation**: Phonetic pronunciation in brackets [optional]
- **word_type**: Part of speech in parentheses (optional)
- **definition**: Word definition (required)

### File Naming
- Use `.txt` extension
- Use descriptive names (e.g., `dictionary.txt`, `verbs.txt`, `nouns.txt`)
- Files are processed in alphabetical order

## Processing

To generate the database from these text files:

```bash
cd backend
npm run build-db
```

The system will:
1. Read all `.txt` files in this directory
2. Parse dictionary entries using the format above
3. Validate entries for quality and completeness
4. Generate SQLite database with full-text search
5. Copy database to frontend assets for mobile app

## Tips

- Ensure UTF-8 encoding for proper Dainamese character support
- One entry per line is recommended
- Use consistent formatting for best results
- Empty lines are ignored during processing
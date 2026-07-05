# ScholarPulse (shiny‑parakeet)

A sleek Flask web application that fetches the latest open-access research articles using the **CORE API v3**:

- **Distance Learning & Open Education** – three articles matching open education queries from the CORE repository.
- **Technology‑Enhanced Learning** – three articles matching tech-enhanced learning queries from the CORE repository.

The application also downloads and parses PDF full-texts of selected articles dynamically, generating custom social media (Twitter/X) posts, citations (APA, MLA, BibTeX), and video/podcast script outlines in different tones and lengths. It also has a built-in Text-to-Speech preview for reading the scripts aloud.

The UI features a customizable dark/light mode, a refresh button with a loading spinner, a **How it works** modal, and a footer credit to VisionDesignLab.

## Configuration

ScholarPulse requires a CORE API key to fetch articles. 

1. Obtain a free API key from [CORE](https://core.ac.uk/services/api/).
2. Create a `.env` file in the root directory and add your key:
   ```env
   CORE_API_KEY=your_core_api_key_here
   ```

## Quick start
```bash
# Clone the repo
git clone https://github.com/david-mangoro/shiny-parakeet.git
cd shiny-parakeet

# (Optional) create a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install flask requests pypdf python-dotenv

# Run the app
python app.py
```
Open `http://127.0.0.1:5000` in a browser.

## Project structure
```
app.py                 # Flask backend, CORE API fetching, and PDF parsing logic
templates/index.html   # Main page markup and modal UIs
static/css/style.css   # Premium styling with dark/light mode themes
static/js/main.js      # Frontend logic, TTS voice controls, citation formatting, and script generation
.env                   # Local environment configuration (API keys)
.gitignore             # Ignored files
README.md              # You are reading it!
```

## License
MIT – feel free to fork, modify, and share!

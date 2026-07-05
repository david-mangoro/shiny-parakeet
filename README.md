# ScholarPulse (shiny‑parakeet)

A sleek Flask web application that fetches the latest research articles:

uses API to fetch few random aricles to technology enhanced learning then you can turn them into script for youtube or podcast narration.

The UI features a dark‑mode default, a refresh button with a loading spinner, a **How it works** modal, and a footer credit to VisionDesignLab.

## Quick start
```bash
# Clone the repo
git clone https://github.com/david-mangoro/shiny-parakeet.git
cd shiny-parakeet

# (Optional) create a virtual environment
python -m venv venv && source venv/Scripts/activate

# Install dependencies
pip install flask requests beautifulsoup4 lxml

# Run the app
python app.py
```
Open `http://127.0.0.1:5000` in a browser.

## Project structure
```
app.py                 # Flask backend and scraping logic
templates/index.html   # Main page markup
static/css/style.css   # Premium dark‑mode styling
static/js/main.js      # Front‑end logic, data fetching
.gitignore             # Ignored files
README.md              # You are reading it!
```

## License
MIT – feel free to fork, modify, and share!

import os
import io
import requests
from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
from pypdf import PdfReader

load_dotenv()

app = Flask(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

CORE_API_KEY = os.environ.get("CORE_API_KEY")

def clean_text(text):
    if not text:
        return ""
    return " ".join(text.split())

def extract_sections_from_pdf(pdf_url):
    """
    Downloads the PDF, extracts raw text, and separates it into:
    - Abstract/Introduction
    - Methodology
    - Findings/Results
    - Conclusions
    """
    try:
        r = requests.get(pdf_url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return None
            
        pdf_file = io.BytesIO(r.content)
        reader = PdfReader(pdf_file)
        full_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text.append(text)
                
        raw_text = "\n".join(full_text)
        if not raw_text or len(raw_text.strip()) < 100:
            return None
            
        lines = raw_text.split('\n')
        
        abstract_lines = []
        method_lines = []
        findings_lines = []
        conclusion_lines = []
        
        current_section = 'intro' # default segment
        
        for line in lines:
            cleaned_line = line.strip().lower()
            
            # Simple keyword checks to switch state
            if any(h in cleaned_line for h in ['abstract', 'introduction', 'background', 'context']):
                current_section = 'intro'
                continue
            elif any(h in cleaned_line for h in ['method', 'methodology', 'participants', 'procedure', 'setup', 'materials']):
                current_section = 'method'
                continue
            elif any(h in cleaned_line for h in ['finding', 'result', 'analysis', 'data analysis', 'outcomes', 'discoveries']):
                current_section = 'findings'
                continue
            elif any(h in cleaned_line for h in ['conclusion', 'discussion', 'summary of findings', 'future work', 'limitations']):
                current_section = 'conclusion'
                continue
                
            if current_section == 'intro':
                abstract_lines.append(line)
            elif current_section == 'method':
                method_lines.append(line)
            elif current_section == 'findings':
                findings_lines.append(line)
            elif current_section == 'conclusion':
                conclusion_lines.append(line)
                
        # Helper to join and limit size to avoid massive payloads
        def clean_and_slice(lst, max_len=1500):
            txt = clean_text(" ".join(lst))
            if len(txt) > max_len:
                return txt[:max_len] + "..."
            return txt

        return {
            'abstract': clean_and_slice(abstract_lines) or "No clear introduction extracted.",
            'method': clean_and_slice(method_lines) or "Methodological details are specified in the full publication text.",
            'findings': clean_and_slice(findings_lines) or "See the results section in the original article links.",
            'conclusion': clean_and_slice(conclusion_lines) or "Please review the full publication discussion."
        }
    except Exception as e:
        print(f"Error parsing PDF from {pdf_url}: {e}")
    return None

def fetch_core_articles(query, limit=3):
    """
    Fetch articles from CORE API v3 search works endpoint.
    """
    articles = []
    if not CORE_API_KEY:
        print("Warning: CORE_API_KEY is not set.")
        return articles

    try:
        url = "https://api.core.ac.uk/v3/search/works"
        headers = {
            'Authorization': f'Bearer {CORE_API_KEY}',
            'Content-Type': 'application/json',
            'User-Agent': HEADERS['User-Agent']
        }
        params = {
            'q': query,
            'limit': limit
        }
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            
            for work in results:
                title = clean_text(work.get('title'))
                
                # Reconstruct authors string
                authors_list = work.get('authors', [])
                if authors_list:
                    authors = ", ".join([a.get('name', '') for a in authors_list if a.get('name')])
                else:
                    authors = "Unknown Authors"
                
                # Abstract / Summary
                summary = clean_text(work.get('abstract'))
                if not summary:
                    summary = "No abstract available in the CORE index. Follow the article link to read more."
                
                # Findings / Conclusions (synthesized from topics/subjects or custom message)
                subjects = work.get('subjects', []) or work.get('topics', [])
                subject_names = [s.get('name') for s in subjects if s.get('name')]
                if subject_names:
                    findings = f"This work covers subjects related to: {', '.join(subject_names[:5])}. Key insights focus on theoretical models and practical applications within these fields."
                else:
                    findings = "Details on specific methodology and outcomes are available in the full text of the publication."

                # Link preference: DOI URL first, then downloadUrl, then OAI identifier or fallback
                doi = work.get('doi')
                link = f"https://doi.org/{doi}" if doi else (work.get('downloadUrl') or "https://core.ac.uk")
                
                # Grab downloadUrl directly to parse PDF if needed
                download_url = work.get('downloadUrl') or ""

                # Date/Year published
                date = str(work.get('yearPublished') or '')

                articles.append({
                    'title': title,
                    'link': link,
                    'downloadUrl': download_url,
                    'authors': authors,
                    'date': date,
                    'summary': summary,
                    'findings': findings,
                    'source': 'CORE Repository'
                })
        else:
            print(f"CORE API returned status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error calling CORE API for query '{query}': {e}")
    
    return articles

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/articles')
def api_articles():
    # Query 1 represents Open/Distance Learning (previously EuroDL)
    eurodl = fetch_core_articles('title:"distance learning" OR title:"open education"', limit=3)
    # Query 2 represents general Technology Enhanced Learning (previously Google Scholar)
    scholar = fetch_core_articles('"technology enhanced learning"', limit=3)
    
    response = jsonify({
        'success': True,
        'eurodl': eurodl,
        'scholar': scholar
    })
    # Prevent browser/proxy caching
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    return response

@app.route('/api/article-fulltext')
def api_article_fulltext():
    download_url = request.args.get('downloadUrl', '')
    if not download_url:
        return jsonify({'success': False, 'message': 'No download URL specified.'})
        
    print(f"Fetching and parsing full text from PDF: {download_url}")
    parsed = extract_sections_from_pdf(download_url)
    
    if parsed:
        return jsonify({
            'success': True,
            'abstract': parsed['abstract'],
            'method': parsed['method'],
            'findings': parsed['findings'],
            'conclusion': parsed['conclusion']
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Could not parse or download PDF. Falling back to default metadata.'
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000)



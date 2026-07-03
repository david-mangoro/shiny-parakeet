import os
import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template

app = Flask(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

def clean_text(text):
    if not text:
        return ""
    # Normalize whitespace
    return " ".join(text.split())

def fetch_openalex_details(title):
    """
    Search OpenAlex API by title to get detailed abstract / findings.
    """
    try:
        url = f"https://api.openalex.org/works?filter=title.search:{requests.utils.quote(title)}&per_page=1"
        r = requests.get(url, headers=HEADERS, timeout=5)
        if r.status_code == 200:
            data = r.json()
            if data.get('results'):
                work = data['results'][0]
                
                # Reconstruct abstract
                abstract = ""
                inv_index = work.get('abstract_inverted_index')
                if inv_index:
                    try:
                        abstract_len = max([max(positions) for word, positions in inv_index.items()]) + 1
                        abstract_words = ["" for _ in range(abstract_len)]
                        for word, positions in inv_index.items():
                            for pos in positions:
                                abstract_words[pos] = word
                        abstract = " ".join(abstract_words)
                    except Exception:
                        pass
                
                # Try to get concepts or citations for findings
                concepts = [c.get('display_name') for c in work.get('concepts', [])[:5]]
                
                return {
                    'abstract': abstract,
                    'doi': work.get('doi'),
                    'concepts': concepts,
                    'publication_year': work.get('publication_year'),
                    'authors': ", ".join([a.get('author', {}).get('display_name', '') for a in work.get('memberships', []) or work.get('authorships', [])])
                }
    except Exception as e:
        print(f"Error calling OpenAlex for '{title}': {e}")
    return None

def fetch_eurodl_articles():
    articles = []
    try:
        url = 'https://eurodljournal.com/en/articles'
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return articles
            
        soup = BeautifulSoup(r.text, 'html.parser')
        list_items = soup.select('ul.hdYziB li article')[:3]
        
        for li in list_items:
            title_el = li.select_one('.eFBhnc a')
            if not title_el:
                continue
                
            title = clean_text(title_el.text)
            href = title_el['href']
            if not href.startswith('http'):
                href = 'https://eurodljournal.com' + href
                
            author_el = li.select_one('address')
            authors = clean_text(author_el.text) if author_el else 'Unknown Authors'
            
            date_el = li.select_one('time')
            date = clean_text(date_el.text) if date_el else ''
            
            # Fetch details for abstract and conclusions
            abstract = "Abstract not found on page."
            conclusions = "Conclusions not found on page."
            try:
                detail_r = requests.get(href, headers=HEADERS, timeout=8)
                if detail_r.status_code == 200:
                    detail_soup = BeautifulSoup(detail_r.text, 'html.parser')
                    
                    # Abstract Extraction
                    meta_desc = detail_soup.find('meta', {'name': 'DC.Description'})
                    if meta_desc:
                        abstract = clean_text(meta_desc.get('content', ''))
                    if not abstract:
                        meta_abs = detail_soup.find('meta', {'name': 'DC.Description.abstract'})
                        if meta_abs:
                            abstract = clean_text(meta_abs.get('content', ''))
                    if not abstract or len(abstract) < 10:
                        abs_sec = detail_soup.select_one('#abstract p') or detail_soup.select_one('.eQHHlj p')
                        if abs_sec:
                            abstract = clean_text(abs_sec.text)
                            
                    # Conclusions Extraction
                    found_concl = False
                    for h in detail_soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
                        h_text = h.text.lower()
                        if 'conclusion' in h_text or 'key finding' in h_text or 'discussion' in h_text:
                            curr = h.next_sibling
                            content_parts = []
                            while curr:
                                if curr.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                                    break
                                if curr.name == 'p':
                                    content_parts.append(clean_text(curr.text))
                                curr = curr.next_sibling
                            if content_parts:
                                conclusions = " ".join(content_parts)
                                found_concl = True
                                break
                    
                    # Fallback for conclusions: extract last few paragraphs of article-body if no header matches
                    if not found_concl:
                        body_div = detail_soup.select_one('#xml-article') or detail_soup.select_one('.article-body')
                        if body_div:
                            paragraphs = body_div.find_all('p')
                            if paragraphs:
                                # take last 2 paragraphs
                                conclusions = " ".join([clean_text(p.text) for p in paragraphs[-2:]])
            except Exception as e:
                print(f"Error fetching detail page {href}: {e}")
                
            articles.append({
                'title': title,
                'link': href,
                'authors': authors,
                'date': date,
                'summary': abstract,
                'findings': conclusions,
                'source': 'EuroDL Journal'
            })
    except Exception as e:
        print(f"Error fetching EuroDL: {e}")
    return articles

def fetch_google_scholar_articles():
    articles = []
    use_fallback = False
    
    try:
        url = 'https://scholar.google.com/scholar?q=Technology+Enhanced+Learning'
        r = requests.get(url, headers=HEADERS, timeout=10)
        
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            items = soup.select('.gs_ri')[:3]
            
            if not items:
                use_fallback = True
                
            for item in items:
                title_el = item.select_one('.gs_rt a')
                title = clean_text(title_el.text) if title_el else ""
                if not title:
                    title_rt = item.select_one('.gs_rt')
                    if title_rt:
                        # strip out tag prefixes like [PDF]
                        title = clean_text(title_rt.text)
                
                link = title_el['href'] if title_el else ""
                
                snippet_el = item.select_one('.gs_rs')
                snippet = clean_text(snippet_el.text) if snippet_el else "No summary snippet available."
                
                authors_el = item.select_one('.gs_a')
                authors = clean_text(authors_el.text) if authors_el else "Unknown Authors"
                
                # Fetch deeper details from OpenAlex to populate summary & conclusions if available
                summary = snippet
                findings = "Check original link for full conclusions and findings."
                
                if title:
                    oa_data = fetch_openalex_details(title)
                    if oa_data:
                        if oa_data.get('abstract'):
                            summary = oa_data['abstract']
                        if oa_data.get('authors'):
                            authors = oa_data['authors']
                        # Set findings as key concepts or construct a summary conclusion
                        if oa_data.get('concepts'):
                            findings = f"Key topics analyzed: {', '.join(oa_data['concepts'])}. " + findings
                
                articles.append({
                    'title': title,
                    'link': link,
                    'authors': authors,
                    'date': '',
                    'summary': summary,
                    'findings': findings,
                    'source': 'Google Scholar'
                })
        else:
            print(f"Google Scholar returned status code {r.status_code}")
            use_fallback = True
            
    except Exception as e:
        print(f"Error fetching Google Scholar: {e}")
        use_fallback = True
        
    if use_fallback or len(articles) < 3:
        print("Using OpenAlex fallback for Technology Enhanced Learning articles.")
        # Fallback to OpenAlex search
        try:
            url = "https://api.openalex.org/works?search=Technology%20Enhanced%20Learning&per_page=5"
            r = requests.get(url, headers=HEADERS, timeout=8)
            if r.status_code == 200:
                data = r.json()
                results = data.get('results', [])
                # Filter/take up to 3
                for work in results[:3]:
                    title = clean_text(work.get('title'))
                    link = work.get('doi') or work.get('id') or "https://scholar.google.com"
                    
                    # Reconstruct abstract
                    abstract = ""
                    inv_index = work.get('abstract_inverted_index')
                    if inv_index:
                        try:
                            abstract_len = max([max(positions) for word, positions in inv_index.items()]) + 1
                            abstract_words = ["" for _ in range(abstract_len)]
                            for word, positions in inv_index.items():
                                for pos in positions:
                                    abstract_words[pos] = word
                            abstract = " ".join(abstract_words)
                        except Exception:
                            abstract = "Summary available via DOI link."
                    else:
                        abstract = "Summary available via DOI link."
                        
                    authors = ", ".join([a.get('author', {}).get('display_name', '') for a in work.get('authorships', [])])
                    if not authors:
                        authors = "Unknown Authors"
                        
                    concepts = [c.get('display_name') for c in work.get('concepts', [])[:4]]
                    findings = f"Key findings focus on {', '.join(concepts)}. For more, see the original text." if concepts else "See publication details via the link for full conclusions."
                    
                    articles.append({
                        'title': title,
                        'link': link,
                        'authors': authors,
                        'date': str(work.get('publication_year', '')),
                        'summary': abstract,
                        'findings': findings,
                        'source': 'Google Scholar (OpenAlex)'
                    })
        except Exception as e:
            print(f"Error in OpenAlex fallback: {e}")
            
    return articles[:3]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/articles')
def api_articles():
    eurodl = fetch_eurodl_articles()
    scholar = fetch_google_scholar_articles()
    return jsonify({
        'success': True,
        'eurodl': eurodl,
        'scholar': scholar
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const btnSpinner = document.getElementById('btn-spinner');
    const themeToggle = document.getElementById('theme-toggle');
    const lastUpdatedEl = document.getElementById('last-updated');
    const feedStatusEl = document.getElementById('feed-status');
    const eurodlList = document.getElementById('eurodl-list');
    const scholarList = document.getElementById('scholar-list');

    // Theme Management
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.querySelector('.theme-icon').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    };

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.querySelector('.theme-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });

    // Helper to create skeleton loader
    const createSkeleton = () => {
        return `
            <div class="skeleton-container">
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            </div>
        `;
    };

    // Render Articles function
    const renderArticles = (articles, container) => {
        container.innerHTML = '';
        if (!articles || articles.length === 0) {
            container.innerHTML = `<div class="article-card"><p>No articles found. Try refreshing.</p></div>`;
            return;
        }

        articles.forEach((art, idx) => {
            const card = document.createElement('div');
            card.className = 'article-card';
            
            // Store details on card object for action retrieval
            card.dataset.article = JSON.stringify(art);
            
            card.innerHTML = `
                <div class="article-meta">
                    <span class="meta-authors">${art.authors}</span>
                    <span class="meta-date">${art.date || ''}</span>
                </div>
                <h3 class="article-title">${art.title}</h3>
                
                <div class="summary-section">
                    <h4 class="article-section-title">Summary / Abstract</h4>
                    <p class="article-summary">${art.summary || 'No abstract available.'}</p>
                </div>
                
                <div class="findings-box">
                    <h4 class="article-section-title">Key Findings / Conclusions</h4>
                    <p class="article-findings">${art.findings || 'Conclusions available in the publication.'}</p>
                </div>
                
                <div class="card-footer">
                    <a href="${art.link}" target="_blank" rel="noopener noreferrer" class="article-link">
                        Read Full Article 
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7 7 17 7 17 17"></polyline>
                        </svg>
                    </a>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm action-tweet" title="Share on Twitter/X">🐦 Tweet</button>
                        <button class="btn btn-secondary btn-sm action-cite" title="Cite Article">📖 Cite</button>
                        <button class="btn btn-primary btn-sm action-convert" title="Convert to YouTube/Podcast">⚡ Convert</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    };

    // Modal Control Elements (Convert)
    const modal = document.getElementById('action-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeModal = document.getElementById('close-modal');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const ytScriptText = document.getElementById('yt-script-text');
    const podScriptText = document.getElementById('pod-script-text');
    const selectTone = document.getElementById('script-tone');
    const selectLength = document.getElementById('script-length');
    const ytFormatLbl = document.getElementById('yt-format-lbl');
    const podFormatLbl = document.getElementById('pod-format-lbl');

    // Modal Control Elements (Cite)
    const citeModal = document.getElementById('cite-modal');
    const closeCiteModal = document.getElementById('close-cite-modal');
    const citeApa = document.getElementById('cite-apa');
    const citeMla = document.getElementById('cite-mla');
    const citeBibtex = document.getElementById('cite-bibtex');

    // Modal Control Elements (Help)
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelpModal = document.getElementById('close-help-modal');

    let currentSelectedArticle = null;
    let ttsUtterance = null;
    let activeTtsButton = null;

    // TTS Voice Speech Control
    const stopSpeech = () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (activeTtsButton) {
            activeTtsButton.textContent = '🔊 Listen';
            activeTtsButton.classList.remove('btn-danger');
            activeTtsButton.style.backgroundColor = '';
            activeTtsButton = null;
        }
    };

    const speakText = (text, button) => {
        if (!window.speechSynthesis) {
            alert('Your browser does not support Speech Synthesis.');
            return;
        }

        if (window.speechSynthesis.speaking) {
            stopSpeech();
            return;
        }

        // Clean up metadata tags like [0:00 - HOOK] or HOST A: for cleaner voice narration
        const cleanNarration = text
            .replace(/\[\d+:\d+\s*-\s*[^\]]+\]/g, '') // remove brackets
            .replace(/(HOST [A-Z]:|TITLE:|FORMAT:|============================)/gi, '') // remove scripts labels
            .trim();

        ttsUtterance = new SpeechSynthesisUtterance(cleanNarration);
        
        ttsUtterance.onend = () => {
            stopSpeech();
        };

        ttsUtterance.onerror = () => {
            stopSpeech();
        };

        activeTtsButton = button;
        button.textContent = '⏹️ Stop';
        button.style.backgroundColor = '#ef4444';
        window.speechSynthesis.speak(ttsUtterance);
    };

    // Bind TTS Button Click Listeners
    document.querySelectorAll('.btn-tts').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const textToSpeak = document.getElementById(targetId).textContent;
            speakText(textToSpeak, btn);
        });
    });

    // Tab Navigation
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));
            
            btn.classList.add('active');
            const targetTab = btn.dataset.tab;
            document.getElementById(`tab-${targetTab}`).classList.remove('hidden');
            stopSpeech(); // Stop speech when tabs change
        });
    });

    // Close Modals
    closeModal.addEventListener('click', () => {
        modal.setAttribute('hidden', 'true');
        stopSpeech();
    });

    closeCiteModal.addEventListener('click', () => {
        citeModal.setAttribute('hidden', 'true');
    });

    // Help Modal events
    helpBtn.addEventListener('click', () => {
        helpModal.removeAttribute('hidden');
    });

    closeHelpModal.addEventListener('click', () => {
        helpModal.setAttribute('hidden', 'true');
    });

    // Global click listener for cards
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('action-tweet')) {
            const card = e.target.closest('.article-card');
            const art = JSON.parse(card.dataset.article);
            const tweetText = encodeURIComponent(`📚 Just read "${art.title}"\nKey Finding: ${art.findings.substring(0, 100)}...\nSource: ${art.link}`);
            window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
        }
        
        if (e.target.classList.contains('action-convert')) {
            const card = e.target.closest('.article-card');
            currentSelectedArticle = JSON.parse(card.dataset.article);
            openConvertModal(currentSelectedArticle);
        }

        if (e.target.classList.contains('action-cite')) {
            const card = e.target.closest('.article-card');
            const art = JSON.parse(card.dataset.article);
            openCiteModal(art);
        }
    });

    // Copy to clipboard functionality
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-copy');
        if (!btn) return;

        const targetId = btn.dataset.target;
        const textToCopy = document.getElementById(targetId).textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.style.backgroundColor = '#10b981';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '';
            }, 2000);
        });
    });

    // Format Citation Generators
    const openCiteModal = (art) => {
        const authorsList = art.authors.split(',').map(a => a.trim());
        const primaryAuthor = authorsList[0] || 'Unknown';
        const year = art.date ? new Date(art.date).getFullYear() || 2026 : 2026;
        
        // Form APA
        const apa = `${art.authors} (${year}). ${art.title}. *${art.source}*. Available at: ${art.link}`;
        // Form MLA
        const mla = `${primaryAuthor}, et al. "${art.title}." *${art.source}*, ${year}, ${art.link}.`;
        // Form BibTeX
        const bibKey = primaryAuthor.split(' ').pop().toLowerCase() + year;
        const bibtex = `@article{${bibKey},\n  author = {${art.authors}},\n  title = {${art.title}},\n  journal = {${art.source}},\n  year = {${year}},\n  url = {${art.link}}\n}`;

        citeApa.textContent = apa;
        citeMla.textContent = mla;
        citeBibtex.textContent = bibtex;
        
        citeModal.removeAttribute('hidden');
    };

    // Dynamic Tone & Length generator rules
    const generateScriptContent = (art, tone, length) => {
        let hook = "";
        let body = "";
        let methodology = art.method || "The paper details key structural models and research designs within the field.";
        let conclusionPart = "";
        let outro = "";

        // Customize hooks and body based on tone
        const introduction = art.abstract || art.summary || "No introduction extracted.";
        const findings = art.findings || "No specific statistical findings extracted.";
        const conclusions = art.conclusion || "Full conclusions available in publication.";

        if (tone === 'academic') {
            hook = `Welcome to this scientific critique. Today we evaluate research titled "${art.title}" by ${art.authors}.`;
            body = `The core thesis of this work investigates the following: "${introduction}" \n\nMethodologically: "${methodology}"`;
            conclusionPart = `The findings indicate: "${findings}" \n\nConclusions: "${conclusions}"`;
            outro = `For the complete statistical dataset, please follow the publication citation link: ${art.link}`;
        } else if (tone === 'edutainment') {
            hook = `Stop scrolling! 🚨 This new study might change how you look at digital education forever. Let's break down "${art.title}"!`;
            body = `Here's the problem: "${introduction.substring(0, 250)}..." Yeah, that's what the researchers set out to solve.\n\nHere is how they did it: "${methodology.substring(0, 200)}..."`;
            conclusionPart = `And what did they discover? Get this: "${findings}" \n\nTheir final takeaway: "${conclusions.substring(0, 250)}..." Absolutely mind-blowing.`;
            outro = `Want to read the full source text? The link is right below. Subscribe for more crazy research updates!`;
        } else { // casual
            hook = `Hey friends! Today I'm checking out a super interesting research paper. It's called "${art.title}".`;
            body = `So, what is it about? The summary describes it as: "${introduction}" \n\nRegarding how they studied this: "${methodology}"`;
            conclusionPart = `The cool part is the conclusion they reached. Essentially, they found: "${findings}" \n\nAnd they discuss: "${conclusions}"`;
            outro = `Definitely check this out if you're interested in the field. I've left the link right here: ${art.link}`;
        }

        // Adjust length details
        let lengthNote = "approx. 3-5 mins";
        if (length === 'short') {
            lengthNote = "approx. 60 seconds (Short/Reel)";
            hook = `🔥 Quick research fact: did you know about "${art.title.substring(0, 50)}..."?`;
            body = `This study states: "${introduction.substring(0, 150)}..."`;
            conclusionPart = `Takeaway: "${findings.substring(0, 150)}..."`;
            outro = `Check link for more!`;
        } else if (length === 'long') {
            lengthNote = "approx. 10 mins (Deep Dive)";
            body += `\n\nAnalyzing the implementation: ${methodology} This connects directly with participant setups and the empirical variables described by the authors.`;
            conclusionPart += `\n\nReviewing the broader scope: ${conclusions} This suggests we need to rethink current models. The implications are deep because it links theory directly with design.`;
        }

        // Return formatted strings
        const yt = `=== YOUTUBE VIDEO SCRIPT ===
TITLE: The Future of Learning: ${art.title}
TONE: ${tone.toUpperCase()} | LENGTH: ${length.toUpperCase()} (${lengthNote})
============================

[INTRO & HOOK]
${hook}

[THE PAPER'S THESIS, CONTEXT & METHOD]
${body}

[CORE FINDINGS & DISCOVERIES]
${conclusionPart}

[WRAP UP & CALL TO ACTION]
${outro}
============================`;

        const pod = `=== PODCAST OUTLINE & DISCUSSION GUIDE ===
EPISODE TITLE: Unpacking the Research: ${art.title}
TONE: ${tone.toUpperCase()} | LENGTH: ${length.toUpperCase()} (${lengthNote})
============================

[INTRO MUSIC FADES IN]

HOST A: Welcome back. Today we're reviewing a key study: "${art.title}".

HOST B: Yes, this is a fascinating one by ${art.authors}.

HOST A: Let's talk about the setup first. What did they set out to analyze and what methods did they use?

HOST B: So, here's what the research paper lays out: 
"${body}"

HOST A: That's super interesting. What were the key findings and final conclusions of the research?

HOST B: Well, the key findings and conclusions were:
"${conclusionPart}"

HOST A: What does this mean for our listeners moving forward?

HOST B: Essentially, it means that ${outro}

[OUTRO MUSIC FADES IN]
============================`;

        return { yt, pod, lengthNote };
    };

    const updateScripts = () => {
        if (!currentSelectedArticle) return;
        const tone = selectTone.value;
        const length = selectLength.value;
        
        const scripts = generateScriptContent(currentSelectedArticle, tone, length);
        
        ytScriptText.textContent = scripts.yt;
        podScriptText.textContent = scripts.pod;
        
        ytFormatLbl.textContent = `Format: Solo Video (${scripts.lengthNote})`;
        podFormatLbl.textContent = `Format: Co-host Podcast Outline (${scripts.lengthNote})`;
    };

    // Re-generate scripts on selector change
    selectTone.addEventListener('change', updateScripts);
    selectLength.addEventListener('change', updateScripts);

    const openConvertModal = async (art) => {
        modalTitle.textContent = `Convert: "${art.title.substring(0, 50)}..."`;
        stopSpeech();
        
        // Show loading placeholder in scripts
        ytScriptText.textContent = "Downloading and parsing PDF full text from CORE repositories... (This may take up to 10 seconds for large files)";
        podScriptText.textContent = "Downloading and parsing PDF full text from CORE repositories... (This may take up to 10 seconds for large files)";
        modal.removeAttribute('hidden');

        let fullTextArticle = { ...art };

        if (art.downloadUrl) {
            try {
                const response = await fetch(`/api/article-fulltext?downloadUrl=${encodeURIComponent(art.downloadUrl)}`);
                const data = await response.json();
                if (data.success) {
                    fullTextArticle.abstract = data.abstract;
                    fullTextArticle.method = data.method;
                    fullTextArticle.findings = data.findings;
                    fullTextArticle.conclusion = data.conclusion;
                }
            } catch (err) {
                console.error("Failed fetching full text PDF, falling back to metadata:", err);
            }
        }

        // Set as current selected and render script
        currentSelectedArticle = fullTextArticle;
        updateScripts();
    };

    // Fetch Articles from Flask API
    const fetchArticles = async () => {
        refreshBtn.disabled = true;
        btnSpinner.removeAttribute('hidden');
        feedStatusEl.textContent = 'Updating...';
        feedStatusEl.className = 'stat-value status-loading';
        
        eurodlList.innerHTML = createSkeleton();
        scholarList.innerHTML = createSkeleton();

        try {
            // Fix 3: Append timestamp to bust any browser/CDN cache
            const response = await fetch(`/api/articles?_t=${Date.now()}`);
            const data = await response.json();
            
            if (data.success) {
                renderArticles(data.eurodl, eurodlList);
                renderArticles(data.scholar, scholarList);
                
                const timeString = new Date().toLocaleTimeString();
                lastUpdatedEl.textContent = timeString;
                feedStatusEl.textContent = 'Synced';
                feedStatusEl.className = 'stat-value status-success';
            } else {
                throw new Error("API returned failure");
            }
        } catch (error) {
            console.error('Error fetching articles:', error);
            feedStatusEl.textContent = 'Failed to sync';
            feedStatusEl.className = 'stat-value status-error';
            eurodlList.innerHTML = `<div class="article-card"><p>Error loading articles. Please try refreshing.</p></div>`;
            scholarList.innerHTML = `<div class="article-card"><p>Error loading articles. Please try refreshing.</p></div>`;
        } finally {
            refreshBtn.disabled = false;
            btnSpinner.setAttribute('hidden', 'true');
        }
    };

    // Event Listener for refresh
    refreshBtn.addEventListener('click', fetchArticles);

    // Initialization
    initTheme();
    fetchArticles();
});

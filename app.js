const API_KEY = '[REDACTED_NEWSAPI_KEY]';
const NEWS_URL = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${API_KEY}`;

async function getNews() {
    const grid = document.getElementById('news-grid');
    
    try {
        const response = await fetch(NEWS_URL);
        if (!response.ok) throw new Error('Failed to fetch news');
        
        const data = await response.json();
        displayNews(data.articles);
    } catch (error) {
        console.error("News Error:", error);
        grid.innerHTML = `<p class="error">Unable to load news at this time.</p>`;
    }
}

function displayNews(articles) {
    const grid = document.getElementById('news-grid');
    let newsHTML = ''; // Use a string buffer for better performance

    if (!articles || articles.length === 0) {
        grid.innerHTML = '<p class="error">No articles found.</p>';
        return;
    }

    articles.filter(a => a.title !== '[Removed]').slice(0, 6).forEach(article => {
        // Fallback for missing data
        const imageUrl = article.urlToImage || 'https://via.placeholder.com/400x200?text=No+Image';
        const description = article.description ? article.description.substring(0, 100) + '...' : 'No description available.';
        const date = new Date(article.publishedAt).toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        newsHTML += `
            <article class="news-card">
                <img src="${imageUrl}" alt="${article.title}" class="news-image" 
                     onerror="this.onerror=null;this.src='https://via.placeholder.com/400x200?text=Image+Unavailable';">
                <div class="news-body">
                    <span class="news-date">${date}</span>
                    <h3 class="news-title">${article.title}</h3>
                    <p class="news-description">${description}</p>
                    <a href="${article.url}" target="_blank" class="btn-read">Read Full Article →</a>
                </div>
            </article>
        `;
    });

    grid.innerHTML = newsHTML; // Update DOM once
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', getNews);

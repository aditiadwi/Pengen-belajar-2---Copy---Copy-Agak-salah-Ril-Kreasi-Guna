const API_KEY = '[REDACTED_NEWSAPI_KEY]';

/**
 * Mock data to show when the API is blocked (e.g., when opening index.html directly via file://)
 */
const MOCK_COFFEE_NEWS = [
    {
        title: "The Art of the Perfect Pour-Over",
        description: "Discover the secrets to mastering the pour-over technique for a cleaner, more vibrant cup of coffee.",
        urlToImage: "https://images.unsplash.com/photo-1544787210-2211d64b565a?w=600&auto=format",
        url: "https://www.bluebottlecoffee.com/us/en/brew-guides/pour-over",
        publishedAt: new Date().toISOString()
    },
    {
        title: "Sustainable Sourcing: From Farm to Cup",
        description: "Learn how we work with small-scale farmers to ensure ethical practices and the highest quality beans.",
        urlToImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format",
        url: "https://www.fairtrade.org.uk/farmers-and-workers/coffee/",
        publishedAt: new Date().toISOString()
    },
    {
        title: "Understanding Coffee Roast Profiles",
        description: "Light, medium, or dark? Explore how different roasting levels affect the flavor notes of your morning brew.",
        urlToImage: "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600&auto=format",
        url: "https://www.ncausa.org/about-coffee/coffee-roasts-guide",
        publishedAt: new Date().toISOString()
    }
];

/**
 * Fetches news related to coffee, brewing tips, and recipes.
 */
async function getCoffeeNews() {
    const grid = document.getElementById('news-grid');
    
    try {
        // NewsAPI Free Tier restriction: Requests from browser are restricted to 'localhost'.
        // Opening via 'file://' will trigger a 426 error.
        if (window.location.protocol === 'file:') {
            console.warn("NewsAPI restricts requests from 'file://'. Using curated fallback coffee content.");
            displayNews(MOCK_COFFEE_NEWS);
            return;
        }

        const url = new URL('https://newsapi.org/v2/everything');
        url.searchParams.append('q', 'coffee OR "brewing coffee" OR "coffee recipes"');
        url.searchParams.append('sortBy', 'relevancy');
        url.searchParams.append('pageSize', '6');
        url.searchParams.append('language', 'en');
        url.searchParams.append('apiKey', API_KEY);

        const response = await fetch(url);
        
        // Handle 426 Upgrade Required (common for NewsAPI free tier on non-localhost)
        if (response.status === 426) {
            throw new Error('NewsAPI requires a local server (localhost) for free tier requests.');
        }

        if (!response.ok) throw new Error('Failed to fetch coffee news');
        
        const data = await response.json();
        displayNews(data.articles);
    } catch (error) {
        console.error("News Error:", error);
        // On error, we still show the mock data so the site looks good
        displayNews(MOCK_COFFEE_NEWS);
        
        // Optional: Show a small hint to the user about why the API failed
        const hint = document.createElement('p');
        hint.style.fontSize = '0.8rem';
        hint.style.color = '#888';
        hint.style.textAlign = 'center';
        hint.style.marginTop = '20px';
        hint.style.gridColumn = '1 / -1';
        hint.innerText = `Note: Showing curated fallback content because: ${error.message}`;
        grid.appendChild(hint);
    }
}

/**
 * Displays the fetched articles in the news grid.
 * @param {Array} articles 
 */
function displayNews(articles) {
    const grid = document.getElementById('news-grid');

    if (!articles || articles.length === 0) {
        grid.innerHTML = '<p class="error">No coffee articles found at the moment. Check back later!</p>';
        return;
    }

    let newsHTML = ''; 
    articles.filter(a => a.title !== '[Removed]').forEach(article => {
        const imageUrl = article.urlToImage || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format';
        const description = article.description ? article.description.substring(0, 120) + '...' : 'Dive into the world of coffee with this interesting read.';
        const date = new Date(article.publishedAt).toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        newsHTML += `
            <article class="news-card">
                <img src="${imageUrl}" alt="${article.title}" class="news-image" 
                     onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format';">
                <div class="news-body">
                    <span class="news-date">${date}</span>
                    <h3 class="news-title">${article.title}</h3>
                    <p class="news-description">${description}</p>
                    <a href="${article.url}" target="_blank" class="btn-read">Discover More →</a>
                </div>
            </article>
        `;
    });

    grid.innerHTML = newsHTML;
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', getCoffeeNews);

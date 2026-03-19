import logging
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

def scrape_live_news(topic: str, max_results: int = 3) -> str:
    """
    Silently scrapes DuckDuckGo for the latest news headlines related to the topic.
    Returns a formatted string of the top headlines to inject into the LLM prompt.
    """
    try:
        logger.info(f"Querying DuckDuckGo Live Web Search for: {topic}")
        results = DDGS().text(f"{topic} news today", max_results=max_results)
        
        if not results:
            return ""
            
        headlines = []
        for r in results:
            title = r.get("title", "")
            if title:
                headlines.append(f"- {title}")
                
        if headlines:
            formatted_news = "\n".join(headlines)
            return f"\n\nCRITICAL CONTEXT FROM LIVE WEB SEARCH (Discuss these exact headlines naturally in the conversation!):\n{formatted_news}\n"
        return ""
        
    except Exception as e:
        logger.error(f"Failed to scrape DuckDuckGo for live news: {e}")
        return ""

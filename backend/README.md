# FastAPI Job Automation Backend

A modern Python backend for the job application automation system, replacing the Node.js proxy.

## Features

- **Career Page Discovery**: OpenAI-powered web search to find real company career pages
- **Traditional Job Scraping**: HTML parsing with AI enhancement using LangChain
- **AI Vision Scraping**: Advanced scraping using GPT-4o Vision with Playwright browser automation
- **CORS Support**: Proper CORS handling for frontend integration
- **Async Performance**: Built with FastAPI for high-performance async operations

## Quick Start

1. **Setup the backend**:
   ```bash
   cd backend
   python setup.py
   ```

2. **Start the server**:
   ```bash
   python start.py
   ```

3. **Start the full application**:
   ```bash
   # From the root directory
   npm run dev:full
   ```

## API Endpoints

### Career Discovery
- `POST /api/web-search-career-page` - Find company career pages using OpenAI web search

### Job Scraping
- `POST /api/scrape-jobs` - Traditional HTML parsing with AI enhancement
- `POST /api/scrape-jobs-ai-vision` - Advanced AI Vision scraping with browser automation
- `POST /api/fetch-content` - Raw HTML content fetching

### Health & Info
- `GET /health` - Health check
- `GET /docs` - Swagger API documentation

## Configuration

Create a `.env` file in the root directory with:

```env
OPENAI_API_KEY=your_openai_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_SERVICE_KEY=your_supabase_service_key
BACKEND_PORT=8000
```

## Architecture Benefits

### vs Node.js Proxy
- ✅ **Better AI Integration**: Native Python OpenAI and LangChain support
- ✅ **Superior Web Scraping**: Playwright + BeautifulSoup + AI Vision
- ✅ **Type Safety**: Pydantic models for request/response validation
- ✅ **Performance**: FastAPI's async capabilities
- ✅ **Maintainability**: Clean Python code vs mixed JS/proxy setup
- ✅ **Scalability**: FastAPI's production-ready architecture

### Key Improvements
1. **Real Career Page Discovery**: OpenAI web search finds actual company career pages
2. **AI Vision Scraping**: GPT-4o can "see" and navigate websites like a human
3. **Enhanced Job Parsing**: LangChain pipelines for intelligent job data extraction
4. **Better Error Handling**: Comprehensive exception handling and logging
5. **API Documentation**: Auto-generated Swagger docs at `/docs`

## Development

- **Frontend**: React + TypeScript (localhost:8087)
- **Backend**: FastAPI + Python (localhost:8000)
- **Database**: Supabase PostgreSQL

## Deployment

The FastAPI backend is production-ready and can be deployed to:
- Heroku
- AWS Lambda (with Mangum)
- Docker containers
- Traditional VPS

## Migration Notes

The new FastAPI backend is a drop-in replacement for the Node.js proxy. All frontend services have been updated to use the new endpoints:

- `localhost:3001` → `localhost:8000`
- Enhanced request/response models
- Better error handling and logging
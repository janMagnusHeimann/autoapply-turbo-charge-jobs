# 🚀 How to Enable REAL Job Scraping

## The Problem
Currently, jobs are AI-generated because the proxy server needed for real web scraping isn't running.

## The Solution

### Option 1: Quick Start (Recommended)
```bash
# Start both frontend and proxy server together
npm run dev:full
```

### Option 2: Manual Start (Two Terminals)
```bash
# Terminal 1: Start proxy server
npm run proxy

# Terminal 2: Start frontend  
npm run dev
```

## How to Verify It's Working

### 1. Check Proxy Server
Visit: http://localhost:3001/health
- ✅ Should show: `{"status":"ok","message":"Scraping proxy server is running"}`
- ❌ If connection fails: Proxy server not running

### 2. Test Real Scraping
Open browser console (F12) and look for these logs when clicking "Apply Here":
```
🔍 Attempting to fetch: https://traderepublic.com/careers
📡 Response status: 200
✅ Successfully fetched 15430 characters
```

### 3. Check Job Source Badges
Jobs will show:
- 🔍 **Real** - Actually scraped from career pages
- 🤖 **AI** - Generated when scraping fails
- 📋 **Demo** - Fallback when no API key

## Current vs Fixed Workflow

### Before (What You're Seeing Now)
```
Click "Apply Here" 
→ Proxy server not running 
→ Real scraping fails silently
→ Falls back to AI generation
→ Shows fake jobs with 🤖 AI badge
```

### After (With Proxy Server Running)
```
Click "Apply Here"
→ Proxy server running on :3001
→ Real scraping of career page
→ LLM extracts actual job listings  
→ Shows real jobs with 🔍 Real badge
```

## Testing Real Scraping

### 1. Start the System
```bash
npm run dev:full
```

### 2. Verify Proxy is Running
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","message":"Scraping proxy server is running"}
```

### 3. Test Trade Republic
1. Go to Company Directory
2. Click "Apply Here" on Trade Republic
3. Watch browser console for scraping logs
4. Check job badges for 🔍 Real indicator

## Debug Commands

### Check if Proxy is Running
```bash
node debug-scraping-issue.js
```

### Manual Scraping Test
```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://traderepublic.com/careers"}'
```

## Expected Results

With real scraping enabled, you should see:
- **Different job titles** for each company (not the same generic ones)
- **Real application URLs** that go to actual job pages
- **🔍 Real badges** on scraped jobs
- **Console logs** showing actual HTTP requests and responses
- **Scraping steps** in the agent dialog showing real URLs being fetched

## If Real Scraping Fails

The system gracefully falls back:
1. **Real Scraping** (Primary) - Scrapes actual career pages
2. **AI Generation** (Secondary) - Creates realistic jobs using company info
3. **Demo Jobs** (Tertiary) - Basic fallback when no API available

The key difference is you'll see **detailed error messages** in the agent steps explaining why real scraping failed, instead of silently showing AI-generated jobs.
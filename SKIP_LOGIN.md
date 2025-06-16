# 🔓 Skip Login for Development

## Quick Setup

I've already configured everything for you! Just restart your development server:

```bash
# Stop your current server (Ctrl+C)
# Then restart with:
npm run dev:full
```

## What This Does

✅ **Bypasses all authentication** - No login required  
✅ **Creates a mock user profile** - "Development User" with sample data  
✅ **Provides mock preferences** - Berlin location, salary range, etc.  
✅ **Works with all features** - Job discovery, CV generation, etc.  

## How It Works

The system checks for `VITE_BYPASS_AUTH=true` in your `.env` file:

- ✅ **Development mode** + **Bypass flag** = Skip login entirely
- 🔒 **Production mode** = Normal authentication required

## Mock User Profile

When bypassed, you'll be logged in as:
- **Name:** Development User  
- **Email:** dev@example.com
- **Location:** Berlin, Germany
- **Title:** Senior Software Engineer
- **Salary Range:** €65,000 - €95,000
- **Preferred Locations:** Berlin, Munich, Remote

## Verify It's Working

1. **Start the app:** `npm run dev:full`
2. **Check console:** Should see `🔓 Development mode: Authentication bypassed`
3. **Access app:** Go directly to Company Directory without login
4. **Test features:** Click "Apply Here" on any company

## To Re-enable Authentication

If you want to test real login later:

```bash
# Edit .env file and change:
VITE_BYPASS_AUTH=false

# Or remove the line entirely
```

## Test Real Job Scraping

Now you can test the real job scraping we implemented:

1. **Start full system:** `npm run dev:full` 
2. **Go to Company Directory** (no login needed!)
3. **Click "Apply Here"** on Trade Republic
4. **Check browser console** for real scraping logs
5. **Look for job badges:** 🔍 Real vs 🤖 AI

You should now be able to bypass login completely and test the real job scraping functionality! 🎉
# Deployment Guide

## Overview
This document provides comprehensive instructions for deploying the AutoApply application to production environments, including database setup, environment configuration, and deployment best practices.

## Prerequisites

### 1. Supabase Project Setup
- Create a new project at [supabase.com](https://supabase.com)
- Note down the project URL and anon key
- Ensure project is in a suitable region for your users

### 2. Development Tools
- Node.js 18+ 
- npm or yarn package manager
- Git for version control

## Environment Configuration

### 1. Environment Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Analytics and Monitoring
VITE_ANALYTICS_ID=your-analytics-id
VITE_SENTRY_DSN=your-sentry-dsn
```

### 2. Production Environment Variables

For production deployment, ensure these variables are set in your hosting platform:

```env
# Required
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# Recommended for production
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
```

### 3. Security Considerations

**Environment Variable Security**:
- Never commit `.env` files to version control
- Use different Supabase projects for development/staging/production
- Rotate keys regularly
- Use least-privilege principles for API keys

## Database Setup

### 1. Run Migrations

#### Option A: Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

#### Option B: Manual SQL Execution
1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Execute the SQL

### 2. Seed Data (Optional)

For development/staging environments:
```bash
# Run seed data
supabase db reset --linked
```

Or manually execute `supabase/seed.sql` in the SQL Editor.

### 3. Database Configuration Verification

Verify the following are properly configured:

#### Row Level Security (RLS)
```sql
-- Check RLS is enabled on user tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

#### Indexes
```sql
-- Verify critical indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';
```

#### Triggers
```sql
-- Verify user creation trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

## Frontend Deployment

### 1. Build Configuration

#### Package.json Scripts
```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:production": "NODE_ENV=production npm run build",
    "preview": "vite preview",
    "build:analyze": "npm run build && npx vite-bundle-analyzer dist"
  }
}
```

#### Vite Configuration (vite.config.ts)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Set to true for debugging
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  preview: {
    port: 3000,
    strictPort: true
  }
})
```

### 2. Vercel Deployment (Recommended)

#### Setup
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### vercel.json Configuration
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "functions": {
    "app.js": {
      "maxDuration": 30
    }
  }
}
```

#### Vercel Environment Variables
Set in Vercel Dashboard → Project Settings → Environment Variables:
- `VITE_SUPABASE_URL`: Production Supabase URL
- `VITE_SUPABASE_ANON_KEY`: Production anon key

### 3. Netlify Deployment

#### netlify.toml Configuration
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  VITE_APP_ENV = "production"

[context.deploy-preview.environment]
  VITE_APP_ENV = "staging"
```

### 4. Custom Server Deployment

#### Docker Configuration

**Dockerfile**:
```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;
        
        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache static assets
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

**Docker Compose**:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    restart: unless-stopped
```

## Production Optimizations

### 1. Performance Optimizations

#### Bundle Optimization
```bash
# Analyze bundle size
npm run build:analyze

# Check for optimization opportunities
npx vite-bundle-analyzer dist
```

#### Code Splitting
```typescript
// Lazy load dashboard components
const ProfileAssets = lazy(() => import('@/components/dashboard/ProfileAssets'));
const CompanyDirectory = lazy(() => import('@/components/dashboard/CompanyDirectory'));

// Wrap in Suspense
<Suspense fallback={<LoadingSkeleton />}>
  <ProfileAssets />
</Suspense>
```

#### Asset Optimization
```typescript
// Optimize images
import { defineConfig } from 'vite';
import { imageOptimize } from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    imageOptimize({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.65, 0.8] }
    })
  ]
});
```

### 2. Monitoring and Analytics

#### Error Tracking with Sentry
```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new Sentry.BrowserTracing(),
    ],
    tracesSampleRate: 1.0,
  });
}
```

#### Performance Monitoring
```typescript
// src/lib/analytics.ts
export const trackPageView = (page: string) => {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'page_view', {
      page_title: page,
      page_location: window.location.href
    });
  }
};

export const trackUserAction = (action: string, category: string) => {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      event_category: category,
      event_label: action
    });
  }
};
```

### 3. Security Headers

#### Production Headers
```nginx
# nginx configuration
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co;" always;
```

#### Vercel Headers (vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## Database Production Setup

### 1. Backup Strategy

#### Automated Backups
```sql
-- Supabase provides automatic backups
-- Additional custom backup function
CREATE OR REPLACE FUNCTION backup_user_data()
RETURNS void AS $$
DECLARE
    backup_time timestamp := now();
BEGIN
    -- Custom backup logic if needed
    RAISE NOTICE 'Backup completed at %', backup_time;
END;
$$ LANGUAGE plpgsql;
```

### 2. Database Monitoring

#### Performance Monitoring Queries
```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Data Retention Policies

#### Cleanup Functions
```sql
-- Clean up old application history (keep 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_applications()
RETURNS void AS $$
BEGIN
    DELETE FROM application_history 
    WHERE created_at < now() - interval '2 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
SELECT cron.schedule('cleanup-applications', '0 2 * * 0', 'SELECT cleanup_old_applications();');
```

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Build process successful
- [ ] Security headers configured
- [ ] Error monitoring setup
- [ ] Performance monitoring enabled

### Post-deployment
- [ ] Verify application loads correctly
- [ ] Test user signup/login flow
- [ ] Verify database connectivity
- [ ] Check error rates in monitoring
- [ ] Test core user workflows
- [ ] Verify responsive design on mobile

### Ongoing Maintenance
- [ ] Monitor error rates and performance
- [ ] Regular dependency updates
- [ ] Database backup verification
- [ ] Security patch management
- [ ] User feedback monitoring

## Troubleshooting

### Common Issues

#### 1. Environment Variable Not Loading
```bash
# Check if environment variables are available
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

# Ensure variables are prefixed with VITE_
# Restart development server after adding new variables
```

#### 2. Database Connection Issues
```typescript
// Test database connectivity
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('count()')
      .single();
    
    console.log('Database connected:', !error);
  } catch (err) {
    console.error('Database connection failed:', err);
  }
};
```

#### 3. Build Failures
```bash
# Clear cache and reinstall dependencies
rm -rf node_modules dist
npm install
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

#### 4. RLS Policy Issues
```sql
-- Check if policies are properly configured
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public';
```

### Logging and Debugging

#### Production Logging
```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    if (import.meta.env.PROD) {
      console.log(`[INFO] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    if (import.meta.env.PROD && typeof Sentry !== 'undefined') {
      Sentry.captureException(error || new Error(message));
    }
  }
};
```

## Scaling Considerations

### 1. Database Scaling
- Monitor connection pool usage
- Implement read replicas for analytics queries
- Consider database connection pooling for high traffic

### 2. CDN Configuration
- Serve static assets from CDN
- Configure proper cache headers
- Implement image optimization

### 3. Application Scaling
- Implement proper loading states
- Use virtual scrolling for large lists
- Consider implementing caching layers

This deployment guide provides a comprehensive approach to deploying the AutoApply application to production while maintaining security, performance, and reliability standards.
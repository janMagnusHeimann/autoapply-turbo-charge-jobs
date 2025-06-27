# Frontend Dockerfile for Vite React App
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 8087

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8087 || exit 1

# Start the application in preview mode (serves the built dist folder)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8087"]
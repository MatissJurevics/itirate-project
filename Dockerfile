# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies needed for native modules (like pg)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Expose Next.js dev server port
EXPOSE 3000

# Set environment to development
ENV NODE_ENV=development

# Run the dev server
CMD ["npm", "run", "dev"]


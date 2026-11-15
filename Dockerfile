FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Set default port and expose it
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["node", "server.js"]

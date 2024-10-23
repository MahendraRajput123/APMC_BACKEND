FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 8000

# Start the application
CMD ["ts-node", "src/index.ts"]
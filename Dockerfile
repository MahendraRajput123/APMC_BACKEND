FROM node:18-alpine

# Install mysql-client for wait-for-it script
RUN apk add --no-cache mysql-client

WORKDIR /app

# Install necessary global packages
RUN npm install -g typescript ts-node

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Make wait-for-it script executable
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Build TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 8000

# Use wait-for-it script before starting the application
CMD ["/wait-for-it.sh", "mysql_db", "node", "dist/src/index.js"]
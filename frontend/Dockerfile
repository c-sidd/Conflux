FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy all files
COPY . .

# Build the application
RUN npm run build

# Start the application
CMD ["npm", "start"]

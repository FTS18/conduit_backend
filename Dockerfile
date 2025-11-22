FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig*.json ./

# Install dev dependencies for build
RUN npm install typescript ts-node @types/node

# Generate Prisma client
RUN npx prisma generate --schema=./src/prisma/schema.prisma

# Build the application
RUN npx nx build api --configuration=production

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/api/main.js"]
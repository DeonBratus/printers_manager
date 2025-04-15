FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Fix permissions and build the application
RUN chmod -R 755 node_modules/.bin/ && npm run build

# Production stage
FROM nginx:alpine

# Copy built files from build stage to nginx server
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port for the application
EXPOSE 80

# Command to run the application
CMD ["nginx", "-g", "daemon off;"]

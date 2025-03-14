# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim AS builder

# Install pnpm globally and necessary build tools
RUN npm install -g pnpm@9.15.4 && \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y \
    git \
    python3 \
    python3-pip \
    curl \
    node-gyp \
    ffmpeg \
    libtool-bin \
    autoconf \
    automake \
    libopus-dev \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    openssl \
    libssl-dev libsecret-1-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3 as the default python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Set the working directory
WORKDIR /app

# Copy application code
COPY . .

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build the project
RUN pnpm run build && pnpm prune --prod

# Final runtime image
FROM node:23.3.0-slim

# Install runtime dependencies
RUN npm install -g pnpm@9.15.4 && \
    apt-get update && \
    apt-get install -y \
    git \
    python3 \
    ffmpeg \
    postgresql-server-dev-all \
    postgresql-contrib \
    build-essential \
    curl \
    postgresql-15 \
    postgresql-contrib-15 && \
    # Install pgvector
    curl -L -o vector.tar.gz https://github.com/pgvector/pgvector/archive/refs/tags/v0.5.1.tar.gz && \
    tar -xzvf vector.tar.gz && \
    cd pgvector-0.5.1 && \
    make && \
    make install && \
    cd .. && \
    rm -rf pgvector-0.5.1 vector.tar.gz && \
    # Create extension directory if it doesn't exist
    mkdir -p /usr/share/postgresql/17/extension && \
    # Copy the extension files to the correct location
    cp /usr/lib/postgresql/17/lib/vector.so /usr/lib/postgresql/17/lib/ && \
    cp /usr/share/postgresql/17/extension/vector.control /usr/share/postgresql/17/extension/ && \
    cp /usr/share/postgresql/17/extension/vector--*.sql /usr/share/postgresql/17/extension/ && \
    # Clean up
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy built artifacts and production dependencies from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/agent ./agent
COPY --from=builder /app/client ./client
COPY --from=builder /app/lerna.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/characters ./characters

# Expose necessary ports
EXPOSE 3000 5173

# Command to start the application
CMD ["sh", "-c", "pnpm start & pnpm start:client"]

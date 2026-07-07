# Stage 1: Build Frontend
FROM oven/bun:1.2.14 AS frontend-builder
WORKDIR /app/frontend

# Install dependencies first for caching
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY frontend/ ./
RUN bun run build

# Stage 2: Build Backend
FROM golang:1.26.4-alpine AS backend-builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git make

# Copy go mod and install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Copy built frontend assets into the embedded UI package
COPY --from=frontend-builder /app/frontend/dist ./internal/ui/dist

# Build the backend
RUN make build-backend

# Stage 3: Final Image
FROM alpine:3.21
WORKDIR /app

# Install CA certificates for HTTPS requests and tzdata for timezones
RUN apk add --no-cache ca-certificates tzdata

# Copy the compiled binary
COPY --from=backend-builder /app/bin/docker-crafter /app/docker-crafter

# Expose the API port
EXPOSE 8080

# Run the application
CMD ["/app/docker-crafter"]

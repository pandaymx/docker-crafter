.PHONY: all build build-backend build-frontend run run-backend run-frontend clean test verify format lint

# ==============================================================================
# Variables

APP_NAME := docker-crafter
BIN_DIR := bin
BIN_PATH := $(BIN_DIR)/$(APP_NAME)
MAIN_PATH := cmd/server/main.go

# Git based versioning
GIT_TAG := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# TODO: Add your specific environment variables here if needed
# e.g. export CRAFTER_PORT=8080
ENV_VARS := CGO_ENABLED=0

# TODO: Add your specific build tags here if needed
# e.g. BUILD_TAGS := -tags="pro"
BUILD_TAGS :=

LDFLAGS := -ldflags "-X main.Version=$(GIT_TAG) -X main.Commit=$(GIT_COMMIT) -s -w"

# ==============================================================================
# Default

all: verify test build

# ==============================================================================
# Build

build: build-frontend build-backend

build-backend:
	@echo "=> Building backend $(APP_NAME)..."
	@mkdir -p $(BIN_DIR)
	$(ENV_VARS) go build $(BUILD_TAGS) $(LDFLAGS) -o $(BIN_PATH) $(MAIN_PATH)
	@echo "=> Backend built at $(BIN_PATH)"

build-frontend:
	@echo "=> Building frontend..."
	@cd frontend && bun install --frozen-lockfile && bun run build
	@echo "=> Copying frontend dist to backend ui..."
	@rm -rf internal/ui/dist
	@cp -r frontend/dist internal/ui/dist
	@echo "=> Frontend built and copied"

# ==============================================================================
# Run

run: run-backend

run-backend:
	@echo "=> Running backend..."
	$(ENV_VARS) go run $(BUILD_TAGS) $(MAIN_PATH)

run-frontend:
	@echo "=> Running frontend dev server..."
	@cd frontend && bun install --frozen-lockfile && bun run dev

# ==============================================================================
# Test & Verify

test:
	@echo "=> Running tests..."
	go test ./...

verify:
	@echo "=> Verifying go modules..."
	go mod tidy
	@echo "=> Verifying go formatting..."
	@if [ -n "$$(gofmt -l .)" ]; then \
		echo "Go code is not formatted. Run 'make format'"; \
		gofmt -l .; \
		exit 1; \
	fi
	@echo "=> Verifying frontend..."
	@cd frontend && bun run lint && bun run format:check
	@echo "=> Verification passed"

lint:
	@echo "=> Linting frontend..."
	@cd frontend && bun run lint

format:
	@echo "=> Formatting go code..."
	gofmt -w .
	@echo "=> Formatting frontend code..."
	@cd frontend && bun run format

# ==============================================================================
# Clean

clean:
	@echo "=> Cleaning..."
	@rm -rf $(BIN_DIR)
	@rm -rf internal/ui/dist
	@mkdir -p internal/ui/dist
	@echo '<!DOCTYPE html><html><head><title>Placeholder</title></head><body>Frontend not built yet.</body></html>' > internal/ui/dist/index.html
	@cd frontend && rm -rf dist node_modules
	@echo "=> Cleaned"

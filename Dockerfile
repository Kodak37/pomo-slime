# Stage 1: フロントエンドビルド
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json frontend/
RUN cd frontend && npm install
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Stage 2: バックエンドビルド
FROM golang:alpine AS backend-build
WORKDIR /app
COPY backend/go.mod backend/go.sum backend/
RUN cd backend && go mod download
COPY backend/ backend/
RUN cd backend && CGO_ENABLED=0 GOOS=linux go build -o /app/server .

# Stage 3: 実行環境
FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend-build /app/server ./
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
EXPOSE 8080
CMD ["./server"]

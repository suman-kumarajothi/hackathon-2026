# =============================================================================
# Backend Dockerfile — Multi-Stage Build
# =============================================================================
# Stage 1: Build Spring Boot fat JAR with Maven
# Stage 2: Run with minimal Eclipse Temurin JRE 17
#
# Security:
#   - Runs as non-root 'appuser' inside the container
#   - No build tools in the runtime image
#   - File-backed fallback data directory pre-created with correct ownership
#
# Usage:
#   docker build -t hackathon-backend .
#   docker run -p 8080:8080 \
#     -e SPRING_DATA_REDIS_HOST=host.docker.internal \
#     -e ADMIN_PASSWORD=secret \
#     hackathon-backend
# =============================================================================

# --- Stage 1: Build ---
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy POM first for dependency caching (avoids re-downloading on source changes)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn package -DskipTests -B

# --- Stage 2: Runtime ---
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built artifact
COPY --from=build /app/target/*.jar app.jar

# Create data directory for file-backed fallback persistence
RUN mkdir -p /app/data/seed && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 8080

# Health check for Docker Compose and future Kubernetes probes
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Container-aware JVM settings injected via JAVA_OPTS environment variable
ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS:-} -jar app.jar"]

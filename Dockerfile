# Dockerfile for Spring Boot (ShopStack Backend)
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build final jar
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/target/shopstack-backend-*.jar app.jar

# Expose port
EXPOSE 8080

# Run Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]

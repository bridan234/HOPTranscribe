# Stage 1: Build the application
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

WORKDIR /src

# Copy csproj and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o /app/publish --no-restore

# Stage 2: Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0

WORKDIR /app

# Copy published app from build stage
COPY --from=build /app/publish .

# Create logs directory
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Expose port
EXPOSE 8080

# Environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl --fail http://localhost:8080/health/status || exit 1

# Run the application
ENTRYPOINT ["dotnet", "HOPTranscribe.dll"]

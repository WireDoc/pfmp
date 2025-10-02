# Multi-stage build for PFMP-API (.NET 9)
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore first (cache layer)
COPY PFMP-API/PFMP-API.csproj PFMP-API/
RUN dotnet restore PFMP-API/PFMP-API.csproj

# Copy the rest of the source
COPY PFMP-API/ PFMP-API/
WORKDIR /src/PFMP-API
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "PFMP-API.dll"]

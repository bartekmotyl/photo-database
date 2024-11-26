#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/runtime:9.0 AS base
# USER app
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["PhotoDatabaseIndexer/PhotoDatabaseIndexer.csproj", "PhotoDatabaseIndexer/"]
COPY ["PhotoDatabaseLib/PhotoDatabaseLib.csproj", "PhotoDatabaseLib/"]
RUN dotnet restore "./PhotoDatabaseIndexer/PhotoDatabaseIndexer.csproj"
COPY . .
WORKDIR "/src/PhotoDatabaseIndexer"
RUN dotnet build "./PhotoDatabaseIndexer.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./PhotoDatabaseIndexer.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PhotoDatabaseIndexer.dll"]
#!/bin/bash

set -e

echo "Pulling latest code..."
git pull origin main || true

echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo "Cleaning old Docker images..."
docker image prune -f

echo "Deployment complete."
docker ps
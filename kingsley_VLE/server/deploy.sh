#!/bin/bash

# Kingsley VLE - Production Deployment Script

echo "========================================="
echo "Starting Production Deployment..."
echo "========================================="

# Check if prod.env exists
if [ ! -f "prod.env" ]; then
    echo "ERROR: prod.env file not found. Please create one based on the .env template."
    exit 1
fi

echo "[1/3] Building and starting Docker containers..."
# Build and run detached
docker compose --env-file prod.env up -d --build

# Wait a moment for the DB connection to be ready if DB is also dockerized
# If DB is external, this is just a short pause to ensure the container is fully up.
echo "Waiting for container to initialize..."
sleep 5

echo "[2/3] Running Database Migrations..."
# Apply migrations to the empty database to create tables
docker compose exec kingsley-backend npx prisma migrate deploy

echo "[3/3] Seeding the Database with Admin Credentials..."
# Run the seed script to create initial admin users
docker compose exec kingsley-backend node seed.js

echo "========================================="
echo "Deployment Complete! 🚀"
echo "Your backend is now running and seeded."
echo "========================================="

#!/bin/bash

# Kingsley VLE - Update/Redeployment Script

echo "========================================="
echo "Starting Application Update..."
echo "========================================="

# Check if prod.env exists
if [ ! -f "prod.env" ]; then
    echo "ERROR: prod.env file not found."
    exit 1
fi

echo "[1/3] Rebuilding and restarting Docker containers..."
# Build and run detached (picks up any code changes)
docker compose --env-file prod.env up -d --build

echo "Waiting for container and database to initialize..."
sleep 8

echo "[2/3] Running Database Migrations..."
# Apply any new migrations if the database schema changed
docker compose exec kingsley-backend npx prisma migrate deploy

echo "[3/3] Fixing reminder dates (one-time fix for timezone shifts)..."
# Run the reminder date fix script against the live database
node fix-reminder-dates.js

echo "========================================="
echo "Update Complete! 🚀"
echo "Your backend has been successfully redeployed."
echo "========================================="

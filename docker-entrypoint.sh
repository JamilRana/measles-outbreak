#!/bin/sh

# Exit on error
set -e

echo "Waiting for database to be ready..."
# The healthcheck in docker-compose handles this mostly, but prisma migrate deploy ensures it.

echo "Running prisma migrate deploy..."
npx prisma migrate deploy

echo "Running prisma generate..."
npx prisma generate

echo "Seeding database..."
npx prisma db seed || echo "Seed failed or already exists, continuing..."

echo "Starting application..."
npm start

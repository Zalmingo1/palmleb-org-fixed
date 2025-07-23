#!/bin/bash

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate dev --name add-super-admin-role

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run the script to create admin users
echo "Creating admin users..."
npx ts-node scripts/create-admin-users.ts

echo "Database setup completed!" 
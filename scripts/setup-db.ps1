# Run Prisma migrations
Write-Host "Running Prisma migrations..."
npx prisma migrate dev --name add-super-admin-role

# Generate Prisma client
Write-Host "Generating Prisma client..."
npx prisma generate

# Run the script to create admin users
Write-Host "Creating admin users..."
node scripts/create-admin-users.js

Write-Host "Database setup completed!" 
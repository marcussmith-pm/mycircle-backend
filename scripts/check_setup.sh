#!/bin/bash

# Setup verification script for My Circle

echo "🔍 My Circle Setup Verification"
echo "================================"
echo ""

# Check Node.js
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✅ Node.js installed: $NODE_VERSION"

    if [[ "$NODE_VERSION" < "v18" ]]; then
        echo "   ⚠️  Warning: Node.js 18+ recommended"
    fi
else
    echo "   ❌ Node.js not found"
    echo "   Install from https://nodejs.org/"
fi

# Check PostgreSQL
echo ""
echo "2. Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "   ✅ psql installed"
else
    echo "   ⚠️  psql not found"
    echo "   Install PostgreSQL or use Docker"
fi

# Check Docker
echo ""
echo "3. Checking Docker..."
if command -v docker &> /dev/null; then
    echo "   ✅ Docker installed"

    # Check if PostgreSQL container is running
    if docker ps | grep -q mycircle-postgres; then
        echo "   ✅ PostgreSQL container running"
    else
        echo "   ℹ️  PostgreSQL container not running"
        echo "   Start with: docker run --name mycircle-postgres -e POSTGRES_USER=mycircle_user -e POSTGRES_PASSWORD=mycircle_password -e POSTGRES_DB=mycircle -p 5432:5432 -d postgres:14"
    fi
else
    echo "   ℹ️  Docker not found (optional)"
fi

# Check Flutter
echo ""
echo "4. Checking Flutter..."
if command -v flutter &> /dev/null; then
    echo "   ✅ Flutter installed"

    # Run flutter doctor
    echo "   Running flutter doctor..."
    flutter doctor --verbose 2>&1 | grep -E "Flutter|Android|Android Studio|Xcode|VS Code" | head -10
else
    echo "   ℹ️  Flutter not found (needed for mobile app)"
    echo "   Install from https://flutter.dev/"
fi

# Check backend dependencies
echo ""
echo "5. Checking backend dependencies..."
if [ -f "backend/package.json" ]; then
    if [ -d "backend/node_modules" ]; then
        echo "   ✅ Backend dependencies installed"
    else
        echo "   ❌ Backend dependencies not installed"
        echo "   Run: cd backend && npm install"
    fi
else
    echo "   ❌ Backend not found"
fi

# Check .env file
echo ""
echo "6. Checking environment configuration..."
if [ -f "backend/.env" ]; then
    echo "   ✅ .env file exists"

    # Check if Firebase is configured
    if grep -q "your-project-id" backend/.env 2>/dev/null; then
        echo "   ⚠️  Firebase project not configured in .env"
        echo "   Edit backend/.env with your Firebase credentials"
    else
        echo "   ✅ Firebase configured in .env"
    fi
else
    echo "   ⚠️  .env file not found"
    echo "   Run: cp backend/.env.example backend/.env"
fi

# Check database tables
echo ""
echo "7. Checking database..."
if PGPASSWORD=mycircle_password psql -h localhost -U mycircle_user -d mycircle -c '\dt' &> /dev/null; then
    TABLE_COUNT=$(PGPASSWORD=mycircle_password psql -h localhost -U mycircle_user -d mycircle -t -c 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '\''public'\'';')
    echo "   ✅ Database connection successful"
    echo "   Tables found: $TABLE_COUNT"

    if [ "$TABLE_COUNT" -eq "10" ]; then
        echo "   ✅ All 10 tables created"
    else
        echo "   ⚠️  Expected 10 tables, found $TABLE_COUNT"
        echo "   Run: cd backend && npm run db:migrate"
    fi
else
    echo "   ❌ Cannot connect to database"
    echo "   Make sure PostgreSQL is running and migrations are applied"
fi

echo ""
echo "================================"
echo "Setup verification complete!"
echo ""
echo "Next steps:"
echo "1. Configure Firebase (see SETUP_GUIDE.md)"
echo "2. Start the backend: cd backend && npm run dev"
echo "3. Run tests: node backend/scripts/test_api.js"
echo "4. Start Flutter app: flutter run"

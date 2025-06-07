#!/bin/bash

echo "🚀 Setting up AutoApply Database..."

# Check if .env file has been configured
if grep -q "your_supabase_project_url_here" .env; then
    echo "❌ Please update your .env file with actual Supabase credentials first!"
    echo "   Edit .env and replace placeholder values with your Supabase project URL and anon key"
    exit 1
fi

echo "📋 Logging into Supabase..."
supabase login

echo "🔗 Linking to your Supabase project..."
echo "When prompted, enter your project reference ID (found in your Supabase dashboard URL)"
supabase link

echo "📊 Running database migrations..."
supabase db push

echo "🌱 Loading seed data..."
supabase db reset --linked

echo "✅ Database setup complete!"
echo "🎯 You can now test the app with:"
echo "   npm run dev"
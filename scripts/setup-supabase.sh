#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo -e "${BLUE}"
echo "🗄️  Supabase Setup Automation"
echo "============================="
echo -e "${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    log_info "Please log in to Supabase..."
    supabase login
fi

# Check for existing project
log_info "Checking for existing Supabase projects..."
projects=$(supabase projects list 2>/dev/null || echo "")

if [ ! -z "$projects" ]; then
    echo "$projects"
    echo
    read -p "Do you want to use an existing project? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter project reference ID: " project_ref
        log_info "Using existing project: $project_ref"
    else
        create_new=true
    fi
else
    create_new=true
fi

# Create new project if needed
if [ "$create_new" = true ]; then
    log_info "Creating new Supabase project..."
    
    # Get organization ID
    log_info "Fetching organizations..."
    orgs=$(supabase orgs list 2>/dev/null || echo "")
    
    if [ -z "$orgs" ]; then
        log_error "No organizations found. Please create one at https://supabase.com"
        exit 1
    fi
    
    echo "$orgs"
    read -p "Enter organization ID: " org_id
    
    # Project details
    default_name="job-automation-$(date +%s)"
    read -p "Project name [$default_name]: " project_name
    project_name=${project_name:-$default_name}
    
    read -s -p "Database password (min 8 chars): " db_password
    echo
    
    if [ ${#db_password} -lt 8 ]; then
        log_error "Password must be at least 8 characters"
        exit 1
    fi
    
    # Select region
    echo "Available regions:"
    echo "1) us-east-1 (US East)"
    echo "2) us-west-1 (US West)"  
    echo "3) eu-west-1 (Europe)"
    echo "4) ap-southeast-1 (Asia Pacific)"
    read -p "Select region (1-4): " region_choice
    
    case $region_choice in
        1) region="us-east-1" ;;
        2) region="us-west-1" ;;
        3) region="eu-west-1" ;;
        4) region="ap-southeast-1" ;;
        *) region="us-east-1" ;;
    esac
    
    log_info "Creating project '$project_name' in $region..."
    
    # Create project and capture reference
    create_output=$(supabase projects create "$project_name" --org-id "$org_id" --db-password "$db_password" --region "$region" 2>&1)
    
    if [ $? -eq 0 ]; then
        project_ref=$(echo "$create_output" | grep -o '[a-z0-9]\{20\}' | head -1)
        log_success "Project created successfully!"
        log_info "Project reference: $project_ref"
    else
        log_error "Failed to create project: $create_output"
        exit 1
    fi
fi

# Initialize local Supabase if needed
if [ ! -f "supabase/config.toml" ]; then
    log_info "Initializing local Supabase configuration..."
    supabase init
fi

# Link to project
log_info "Linking to Supabase project..."
if supabase link --project-ref "$project_ref" 2>/dev/null; then
    log_success "Successfully linked to project"
else
    log_warning "Link may have failed, but continuing..."
fi

# Apply database migrations
log_info "Applying database schema..."

# Check if migrations exist
if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations)" ]; then
    if supabase db push; then
        log_success "Database schema applied successfully"
    else
        log_warning "Schema application may have failed. Check manually in Supabase dashboard."
    fi
else
    log_warning "No migrations found. You may need to create the database schema manually."
fi

# Get project details
log_info "Fetching project credentials..."
project_info=$(supabase projects list | grep "$project_ref" || echo "")

if [ ! -z "$project_info" ]; then
    # Extract project URL (this is a simplified approach)
    project_url="https://${project_ref}.supabase.co"
    
    log_info "Getting API keys..."
    # This requires the project to be linked and accessible
    settings_output=$(supabase projects api-keys --project-ref "$project_ref" 2>/dev/null || echo "manual")
    
    if [ "$settings_output" != "manual" ]; then
        # Extract anon key (this would need to be parsed from actual output)
        log_info "API keys retrieved successfully"
    else
        log_warning "Could not retrieve API keys automatically"
        log_info "Please get them manually from: https://supabase.com/dashboard/project/$project_ref/settings/api"
    fi
    
    # Update .env file
    log_info "Updating .env file..."
    
    # Backup existing .env
    if [ -f .env ]; then
        cp .env .env.backup.$(date +%s)
    fi
    
    # Update Supabase URL
    if grep -q "VITE_SUPABASE_URL=" .env; then
        sed -i.bak "s|VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=$project_url|" .env
    else
        echo "VITE_SUPABASE_URL=$project_url" >> .env
    fi
    
    log_success "Environment updated with Supabase URL"
    
    # Instructions for manual API key setup
    echo
    log_warning "Manual step required:"
    echo "1. Go to: https://supabase.com/dashboard/project/$project_ref/settings/api"
    echo "2. Copy the 'anon public' key"
    echo "3. Update VITE_SUPABASE_ANON_KEY in .env file"
    echo
    
else
    log_error "Could not fetch project information"
    exit 1
fi

# Test connection
log_info "Testing database connection..."
if supabase db remote commit --message "Setup test"; then
    log_success "Database connection test passed"
else
    log_warning "Database connection test failed. Please check your setup."
fi

# Final instructions
echo
log_success "Supabase setup completed! 🎉"
echo
log_info "Next steps:"
echo "1. Update VITE_SUPABASE_ANON_KEY in .env (see instructions above)"
echo "2. Add OPENAI_API_KEY to .env"
echo "3. Run: docker-compose -f docker-compose.dev.yml up"
echo
log_info "Project details:"
echo "- Project URL: $project_url"
echo "- Project Reference: $project_ref"
echo "- Dashboard: https://supabase.com/dashboard/project/$project_ref"
echo
log_info "Troubleshooting:"
echo "- Check project dashboard for any issues"
echo "- Verify RLS policies are enabled"
echo "- Test auth with a dummy user signup"
#!/bin/bash

# HOPTranscribe Git Repository Setup Script
# This script initializes a Git repository and prepares for first push

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   HOPTranscribe Git Setup Script      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed. Please install Git first.${NC}"
    exit 1
fi

# Check if already a git repository
if [ -d .git ]; then
    echo -e "${YELLOW}Warning: This directory is already a Git repository.${NC}"
    read -p "Do you want to continue? This will reset the repository. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted.${NC}"
        exit 1
    fi
    rm -rf .git
fi

# Initialize git repository
echo -e "${GREEN}[1/6] Initializing Git repository...${NC}"
git init
git branch -M main

# Create .env file from example
echo -e "${GREEN}[2/6] Setting up environment file...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}Created .env file. Please update it with your OpenAI API key.${NC}"
else
    echo -e "${YELLOW}.env file already exists. Skipping.${NC}"
fi

# Stage all files
echo -e "${GREEN}[3/6] Staging files...${NC}"
git add .

# Initial commit
echo -e "${GREEN}[4/6] Creating initial commit...${NC}"
git commit -m "Initial commit: HOPTranscribe v1.0

- React + TypeScript frontend with Vite
- .NET 9 backend API
- Docker containerization (Frontend + Backend)
- Docker Compose orchestration
- GitHub Actions CI/CD for Azure deployment
- Comprehensive documentation"

# Get GitHub repository URL
echo ""
echo -e "${GREEN}[5/6] Setting up remote repository...${NC}"
echo -e "${YELLOW}Please create a new GitHub repository first if you haven't already.${NC}"
echo ""
read -p "Enter your GitHub repository URL (e.g., https://github.com/bridan234/HOPTranscribe.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo -e "${RED}Error: Repository URL cannot be empty.${NC}"
    exit 1
fi

# Add remote
git remote add origin "$REPO_URL"

# Push to GitHub
echo -e "${GREEN}[6/6] Pushing to GitHub...${NC}"
echo -e "${YELLOW}Note: You may be prompted for your GitHub credentials.${NC}"

if git push -u origin main; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   Setup Complete! ✓                   ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Your repository is now set up at:${NC}"
    echo -e "${YELLOW}$REPO_URL${NC}"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "1. Update .env with your OpenAI API key"
    echo "2. Configure GitHub Secrets (see docs/DEPLOYMENT.md)"
    echo "3. Set up Azure resources for deployment"
    echo ""
    echo -e "${GREEN}To test locally:${NC}"
    echo "  docker-compose up -d"
    echo ""
    echo -e "${GREEN}To deploy to Azure:${NC}"
    echo "  git push origin main"
    echo "  (GitHub Actions will automatically deploy)"
else
    echo ""
    echo -e "${RED}Error: Failed to push to GitHub.${NC}"
    echo -e "${YELLOW}Please check:${NC}"
    echo "1. Repository URL is correct"
    echo "2. You have access to the repository"
    echo "3. GitHub authentication is configured"
    echo ""
    echo -e "${YELLOW}You can manually push later with:${NC}"
    echo "  git push -u origin main"
    exit 1
fi

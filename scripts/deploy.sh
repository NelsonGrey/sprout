#!/bin/bash

# Sprout - Manual Deployment Script
# Adapted from wishlist-wizard's scripts/deploy.sh, trimmed to Sprout's
# actual package set (web + functions; no browser extension, no mobile PWA
# hosting target).

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}i  $1${NC}"; }
log_success() { echo -e "${GREEN}OK $1${NC}"; }
log_warning() { echo -e "${YELLOW}!  $1${NC}"; }
log_error() { echo -e "${RED}X  $1${NC}"; }

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

get_project_id_from_alias() {
    local alias="$1"
    node -e "const fs=require('fs');const rc=JSON.parse(fs.readFileSync('.firebaserc','utf8'));const id=rc.projects&&rc.projects['$alias'];if(!id){process.exit(1)};process.stdout.write(id);"
}

resolve_environment() {
    local requested_env="$1"
    if [[ -n "$requested_env" ]]; then
        echo "$requested_env"
        return
    fi

    local branch
    branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
    case "$branch" in
        main) echo "production" ;;
        staging) echo "staging" ;;
        develop) echo "development" ;;
        *)
            log_warning "Unknown branch '$branch'. Defaulting deploy environment to development."
            echo "development"
            ;;
    esac
}

resolve_project_alias() {
    local environment="$1"
    case "$environment" in
        production) echo "production" ;;
        staging) echo "staging" ;;
        development) echo "development" ;;
        *)
            log_error "Invalid environment '$environment'. Use: development | staging | production"
            return 1
            ;;
    esac
}

deploy_component() {
    local component=$1
    local firebase_project_alias=$2

    log_info "Deploying $component to $firebase_project_alias..."

    case $component in
        "web")
            if command_exists firebase; then
                firebase deploy --only hosting --project "$firebase_project_alias"
                log_success "Web app deployed to Firebase Hosting"
            else
                log_error "Firebase CLI not found. Install with: npm i -g firebase-tools"
                return 1
            fi
            ;;
        "functions")
            if command_exists firebase; then
                firebase deploy --only functions --project "$firebase_project_alias"
                log_success "Functions deployed"
            else
                log_error "Firebase CLI not found. Install with: npm i -g firebase-tools"
                return 1
            fi
            ;;
    esac
}

build_all() {
    log_info "Building all components..."
    npm ci
    npm run build
    log_success "All components built successfully"
}

show_usage() {
    echo "Sprout Deployment Script"
    echo ""
    echo "Usage: $0 [OPTION] [ENVIRONMENT]"
    echo ""
    echo "Options:"
    echo "  build           Build all components"
    echo "  deploy-web      Deploy web app to Firebase Hosting"
    echo "  deploy-api      Deploy functions to Firebase Functions"
    echo "  deploy-all      Deploy all components"
    echo "  help            Show this help message"
    echo ""
    echo "Environment (optional): development | staging | production"
    echo "If omitted, environment is inferred from current branch:"
    echo "  develop -> development, staging -> staging, main -> production"
}

DEPLOY_ENVIRONMENT="$(resolve_environment "${2:-}")"
FIREBASE_PROJECT_ALIAS="$(resolve_project_alias "$DEPLOY_ENVIRONMENT")" || exit 1
log_info "Resolved deploy environment: $DEPLOY_ENVIRONMENT (firebase project alias: $FIREBASE_PROJECT_ALIAS)"

case ${1:-help} in
    "build")
        build_all
        ;;
    "deploy-web")
        build_all
        deploy_component "web" "$FIREBASE_PROJECT_ALIAS"
        ;;
    "deploy-api")
        build_all
        deploy_component "functions" "$FIREBASE_PROJECT_ALIAS"
        ;;
    "deploy-all")
        build_all
        deploy_component "web" "$FIREBASE_PROJECT_ALIAS"
        deploy_component "functions" "$FIREBASE_PROJECT_ALIAS"
        log_success "All components deployed!"
        ;;
    "help"|*)
        show_usage
        ;;
esac

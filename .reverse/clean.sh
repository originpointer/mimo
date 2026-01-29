#!/bin/bash
# clean.sh - Remove dependencies and build artifacts across the project

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default flags
DRY_RUN=false
FORCE=false
VERBOSE=false

# Parse arguments
while getopts "fnv" opt; do
    case $opt in
        f) FORCE=true ;;
        n) DRY_RUN=true ;;
        v) VERBOSE=true ;;
        *) echo "Usage: $0 [-f] [-n] [-v]"; exit 1 ;;
    esac
done

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get directory size before cleanup
get_size() {
    local dir="$1"
    if [[ -d "$dir" ]]; then
        du -sh "$dir" 2>/dev/null | cut -f1 || echo "0"
    else
        echo "0"
    fi
}

# Remove items
remove_items() {
    local pattern="$1"
    local description="$2"
    local count=0

    while IFS= read -r -d '' item; do
        if [[ "$VERBOSE" == true ]]; then
            if [[ "$DRY_RUN" == true ]]; then
                log_info "Would remove: $item"
            else
                log_info "Removing: $item"
            fi
        fi
        if [[ "$DRY_RUN" == false ]]; then
            rm -rf "$item"
        fi
        ((count++))
    done < <(find . -name "$pattern" -print0 2>/dev/null)

    if [[ $count -gt 0 ]]; then
        log_success "Found $count $description"
    fi
}

# Remove directories
remove_dirs() {
    local pattern="$1"
    local description="$2"
    local count=0

    while IFS= read -r -d '' item; do
        if [[ "$VERBOSE" == true ]]; then
            local size=$(get_size "$item")
            if [[ "$DRY_RUN" == true ]]; then
                log_info "Would remove: $item ($size)"
            else
                log_info "Removing: $item ($size)"
            fi
        fi
        if [[ "$DRY_RUN" == false ]]; then
            rm -rf "$item"
        fi
        ((count++))
    done < <(find . -type d -name "$pattern" -print0 2>/dev/null)

    if [[ $count -gt 0 ]]; then
        log_success "Found $count $description"
    fi
}

# Main cleanup
main() {
    local start_time=$(date +%s)

    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}      Clean.sh - Project Cleanup       ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    # Show mode
    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN MODE - No files will be deleted"
    fi

    # Calculate total size before cleanup
    local total_before=0
    if [[ "$DRY_RUN" == false ]]; then
        while IFS= read -r -d '' dir; do
            local size=$(du -s "$dir" 2>/dev/null | cut -f1 || echo "0")
            total_before=$((total_before + size))
        done < <(find . -type d \( -name "node_modules" -o -name "dist" -o -name "build" \) -print0 2>/dev/null)
    fi

    # Confirmation
    if [[ "$FORCE" == false && "$DRY_RUN" == false ]]; then
        echo -e "${YELLOW}This will remove:${NC}"
        echo "  - node_modules directories"
        echo "  - dist and build directories"
        echo "  - Lock files (package-lock.json, yarn.lock, pnpm-lock.yaml)"
        echo "  - Cache directories (.cache, .turbo, .next, out)"
        echo "  - Python cache (__pycache__, .pytest_cache)"
        echo "  - .DS_Store files"
        echo ""
        read -p "$(echo -e ${YELLOW}Continue? [y/N]: ${NC})" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_warning "Cleanup cancelled"
            exit 0
        fi
    fi

    echo ""
    log_info "Starting cleanup..."
    echo ""

    # Remove node_modules
    echo -e "${BLUE}[*] Removing node_modules...${NC}"
    remove_dirs "node_modules" "node_modules directories"

    # Remove build artifacts
    echo -e "${BLUE}[*] Removing build artifacts...${NC}"
    remove_dirs "dist" "dist directories"
    remove_dirs "build" "build directories"

    # Remove lock files
    echo -e "${BLUE}[*] Removing lock files...${NC}"
    remove_items "package-lock.json" "package-lock.json files"
    remove_items "yarn.lock" "yarn.lock files"
    remove_items "pnpm-lock.yaml" "pnpm-lock.yaml files"

    # Remove cache directories
    echo -e "${BLUE}[*] Removing cache directories...${NC}"
    remove_dirs ".cache" ".cache directories"
    remove_dirs ".turbo" ".turbo directories"
    remove_dirs ".next" ".next directories"
    remove_dirs "out" "out directories"

    # Remove Python cache
    echo -e "${BLUE}[*] Removing Python cache...${NC}"
    remove_dirs "__pycache__" "__pycache__ directories"
    remove_dirs ".pytest_cache" ".pytest_cache directories"
    remove_items "*.pyc" "*.pyc files"
    remove_items ".pytest_cache" ".pytest_cache directories"

    # Remove macOS files
    echo -e "${BLUE}[*] Removing macOS files...${NC}"
    remove_items ".DS_Store" ".DS_Store files"

    # Optional: Remove .vscode directories (uncomment if needed)
    # echo -e "${BLUE}[*] Removing .vscode directories...${NC}"
    # remove_dirs ".vscode" ".vscode directories"

    echo ""
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [[ "$DRY_RUN" == true ]]; then
        log_success "Dry run completed in ${duration}s (no files were deleted)"
    else
        # Calculate space freed
        local total_after=0
        while IFS= read -r -d '' dir; do
            local size=$(du -s "$dir" 2>/dev/null | cut -f1 || echo "0")
            total_after=$((total_after + size))
        done < <(find . -type d \( -name "node_modules" -o -name "dist" -o -name "build" \) -print0 2>/dev/null)

        local freed=$((total_before - total_after))
        local freed_mb=$((freed / 1024))

        log_success "Cleanup completed in ${duration}s"
        log_success "Space freed: ~${freed_mb} MB"
    fi
}

main

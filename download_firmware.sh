#!/bin/bash

# Script to download WipperSnapper offline firmware assets
# This script fetches the latest offline release assets and saves them to a local folder

# Configuration
REPO="adafruit/Adafruit_Wippersnapper_Arduino"
OUTPUT_DIR="latest_firmware"
RELEASES_API_URL="https://api.github.com/repos/$REPO/releases"
PER_PAGE=30  # GitHub API default per page limit

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Fetching releases information for $REPO..."

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq first."
    echo "On Debian/Ubuntu: sudo apt-get install jq"
    echo "On macOS with Homebrew: brew install jq"
    echo "On Windows with Chocolatey: choco install jq"
    exit 1
fi

# Check if sha256sum is installed
if ! command -v sha256sum &> /dev/null; then
    # Try to use shasum as an alternative on macOS
    if command -v shasum &> /dev/null; then
        SHA256_CMD="shasum -a 256"
    else
        echo "Warning: Neither sha256sum nor shasum found. Hash verification will be skipped."
        SHA256_CMD="echo 'Hash verification not available for'"
    fi
else
    SHA256_CMD="sha256sum"
fi

# Initialize variables
page=1
found_offline_release=false
latest_offline_release=""
latest_published_at=""

# Loop through pages until we find an offline release or run out of releases
while [ "$found_offline_release" = false ]; do
    echo "Fetching page $page of releases..."
    page_url="${RELEASES_API_URL}?page=${page}&per_page=${PER_PAGE}"
    
    # Fetch the page of releases
    page_releases=$(curl -s "$page_url")
    
    # Check if the API call was successful
    if echo "$page_releases" | grep -q "API rate limit exceeded"; then
        echo "Error: GitHub API rate limit exceeded. Try again later or use an API token."
        exit 1
    fi
    
    # Check if we got an empty array (end of pages)
    if [ "$(echo "$page_releases" | jq 'length')" = "0" ]; then
        echo "No more releases found after checking $page pages."
        break
    fi
    
    # Find offline releases in this page - using "*offline*" instead of "*-offline*"
    offline_releases=$(echo "$page_releases" | jq '[.[] | select(.tag_name | contains("offline"))]')
    
    # Check if we found any offline releases
    offline_count=$(echo "$offline_releases" | jq 'length')
    echo "Found $offline_count offline releases on page $page"
    
    if [ "$offline_count" -gt 0 ]; then
        found_offline_release=true
        
        # Get the latest offline release by published_at date
        latest_offline_release=$(echo "$offline_releases" | jq 'sort_by(.published_at) | reverse | .[0]')
    else
        # Move to the next page
        page=$((page + 1))
        
        # Check if we received fewer items than the per_page limit (meaning we're on the last page)
        page_count=$(echo "$page_releases" | jq 'length')
        if [ "$page_count" -lt "$PER_PAGE" ]; then
            echo "Reached the last page with $page_count items (less than $PER_PAGE per page)"
            break
        fi
    fi
done

# Check if we found an offline release
if [ -z "$latest_offline_release" ] || [ "$latest_offline_release" = "null" ]; then
    echo "Error: No offline release found after checking $page pages of releases."
    exit 1
fi

# Extract tag name, release name, and release ID
tag_name=$(echo "$latest_offline_release" | jq -r '.tag_name')
release_name=$(echo "$latest_offline_release" | jq -r '.name')
release_id=$(echo "$latest_offline_release" | jq -r '.id')

echo "Found latest offline release: $release_name (Tag: $tag_name, ID: $release_id)"

# Fetch the complete assets list directly from the assets URL
assets_url="https://api.github.com/repos/$REPO/releases/$release_id/assets"
echo "Fetching complete assets list from: $assets_url"

# Initialize variables for assets pagination
assets_page=1
all_assets="[]"

# Loop through pages to get all assets
while true; do
    echo "Fetching page $assets_page of assets..."
    assets_page_url="${assets_url}?page=${assets_page}&per_page=${PER_PAGE}"
    
    # Fetch the page of assets
    page_assets=$(curl -s "$assets_page_url")
    
    # Check if we got an empty array (end of pages)
    page_assets_count=$(echo "$page_assets" | jq 'length')
    if [ "$page_assets_count" = "0" ]; then
        echo "No more assets found."
        break
    fi
    
    echo "Found $page_assets_count assets on page $assets_page"
    
    # Add this page's assets to our collection
    all_assets=$(echo "$all_assets" "$page_assets" | jq -s '.[0] + .[1]')
    
    # Move to the next page
    assets_page=$((assets_page + 1))
    
    # Check if we received fewer items than the per_page limit (meaning we're on the last page)
    if [ "$page_assets_count" -lt "$PER_PAGE" ]; then
        echo "Reached the last page of assets with $page_assets_count items"
        break
    fi
done

# Filter for UF2 and BIN files
echo "Filtering for firmware files..."
firmware_assets=$(echo "$all_assets" | jq '[.[] | select(.name | endswith(".uf2") or endswith(".bin"))]')

# Check if we found any assets
asset_count=$(echo "$firmware_assets" | jq 'length')
if [ "$asset_count" = "0" ]; then
    echo "No firmware files (.uf2 or .bin) found in release $tag_name."
    exit 1
fi

echo "Found $asset_count firmware files to download."

# Create a temporary directory for hash verification
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT

# Download each asset
echo "$firmware_assets" | jq -r '.[] | @json' | while read -r asset_json; do
    name=$(echo "$asset_json" | jq -r '.name')
    url=$(echo "$asset_json" | jq -r '.browser_download_url')
    size=$(echo "$asset_json" | jq -r '.size')
    output_file="$OUTPUT_DIR/$name"
    
    # Check if file already exists
    if [ -f "$output_file" ]; then
        echo "File $name already exists, checking if it's the same version..."
        
        # Check file size
        existing_size=$(stat -c%s "$output_file" 2>/dev/null || stat -f%z "$output_file" 2>/dev/null)
        
        if [ "$existing_size" = "$size" ]; then
            # Calculate hash of existing file
            existing_hash=$($SHA256_CMD "$output_file" | cut -d' ' -f1)
            
            # Download to temp file for hash comparison
            temp_file="$temp_dir/$name"
            echo "Downloading $name to verify hash..."
            if curl -s -L -o "$temp_file" "$url"; then
                # Calculate hash of downloaded file
                remote_hash=$($SHA256_CMD "$temp_file" | cut -d' ' -f1)
                
                # Compare hashes
                if [ "$existing_hash" = "$remote_hash" ]; then
                    echo "File $name is already up to date (hash verified), skipping download."
                    continue
                else
                    echo "File $name has different hash, downloading new version..."
                fi
            else
                echo "Could not download $name for hash verification, will download again to be safe."
            fi
        else
            echo "File $name has different size, downloading new version..."
        fi
    else
        echo "Downloading $name..."
    fi
    
    # Download the file
    if curl -L -o "$output_file" "$url"; then
        echo "Successfully downloaded $name"
    else
        echo "Failed to download $name"
    fi
done

echo "Download complete. Firmware files saved to $OUTPUT_DIR/"
ls -la "$OUTPUT_DIR"

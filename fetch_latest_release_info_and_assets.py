# Take releases for wippersnapper, filtered to semver including -offline, get next page until finished if none.

# Later match board name to installBoardName from boards (which falls back to boardName)

import requests
import json
import os
from datetime import datetime

# Configuration
REPO = "adafruit/Adafruit_Wippersnapper_Arduino"
OUTPUT_DIR = "latest_firmware"
RELEASES_API_URL = f"https://api.github.com/repos/{REPO}/releases"
PER_PAGE = 30  # GitHub API default per page limit
JS_OUTPUT_FILE = "firmware_data.js"

def fetch_latest_offline_release():
    """Fetch the latest offline release from GitHub API."""
    print(f"Fetching releases information for {REPO}...")
    
    headers = {
        "Accept": "application/vnd.github.v3+json"
    }
    
    all_releases = []
    page = 1
    found_offline_release = False
    latest_offline_release = None
    
    # Loop through pages until we find an offline release or run out of releases
    while not found_offline_release:
        page_url = f"{RELEASES_API_URL}?page={page}&per_page={PER_PAGE}"
        print(f"Fetching page {page} of releases...")
        
        response = requests.get(page_url, headers=headers)
        response.raise_for_status()
        
        page_releases = response.json()
        all_releases.extend(page_releases)
        
        # Check if this page contains any offline releases
        offline_releases = [r for r in page_releases if "offline" in r.get("tag_name", "")]
        
        offline_releases_count = len(offline_releases)
        print(f"Found {offline_releases_count} offline releases on page {page}")
        
        if offline_releases_count > 0:
            found_offline_release = True
            # Get the latest offline release by published date
            latest_offline_release = sorted(
                offline_releases,
                key=lambda x: x.get("published_at", ""),
                reverse=True
            )[0]
            break
        
        # Move to next page if we didn't find any offline releases and there are more pages
        page += 1
        
        # Stop if we received fewer items than the per_page limit (meaning we're on the last page)
        if len(page_releases) < PER_PAGE:
            print(f"Reached the last page with {len(page_releases)} items (less than {PER_PAGE} per page)")
            break
    
    # Check if we found an offline release
    if latest_offline_release is None:
        raise Exception(f"No offline release found after checking {page} pages of releases.")
    
    tag_name = latest_offline_release.get("tag_name")
    release_name = latest_offline_release.get("name")
    release_id = latest_offline_release.get("id")
    release_html_url = latest_offline_release.get("html_url")
    release_published_date = latest_offline_release.get("published_at")
    
    print(f"Found latest offline release: {release_name} (Tag: {tag_name}, ID: {release_id})")
    
    return latest_offline_release, release_id, tag_name, release_name, release_html_url, release_published_date

def fetch_release_assets(release_id):
    """Fetch all assets for a specific release."""
    assets_url = f"https://api.github.com/repos/{REPO}/releases/{release_id}/assets"
    print(f"Fetching complete assets list from: {assets_url}")
    
    headers = {
        "Accept": "application/vnd.github.v3+json"
    }
    
    all_assets = []
    assets_page = 1
    
    # Loop through pages to get all assets
    while True:
        assets_page_url = f"{assets_url}?page={assets_page}&per_page={PER_PAGE}"
        print(f"Fetching page {assets_page} of assets...")
        
        response = requests.get(assets_page_url, headers=headers)
        response.raise_for_status()
        
        page_assets = response.json()
        
        # Add to all assets - ensure it's a list
        if isinstance(page_assets, list):
            all_assets.extend(page_assets)
        else:
            all_assets.append(page_assets)
        
        # Move to next page if there are more assets
        assets_page += 1
        
        # Stop if we received fewer items than the per_page limit (meaning we're on the last page)
        if len(page_assets) < PER_PAGE:
            print(f"Reached the last page of assets with {len(page_assets)} items")
            break
    
    # Filter for UF2 files
    print("Filtering for firmware files...")
    firmware_assets = [
        asset for asset in all_assets 
        if asset.get("name", "").endswith(".uf2")# or asset.get("name", "").endswith(".bin")
    ]
    
    # Check if we found any assets
    if len(firmware_assets) == 0:
        print(f"No firmware files (.uf2) found in this release.")
    
    return firmware_assets

def generate_js_data(release_info, assets):
    """Generate JavaScript data structure with firmware information."""
    tag_name, release_name, release_html_url, release_published_date = release_info
    
    # Format the published date
    try:
        dt = datetime.fromisoformat(release_published_date.replace("Z", "+00:00"))
        formatted_date = dt.strftime("%Y-%m-%d")
    except:
        formatted_date = release_published_date
    
    # Create firmware data object
    firmware_data = {
        "releaseInfo": {
            "version": tag_name,
            "name": release_name,
            "url": release_html_url,
            "publishedDate": formatted_date
        },
        "firmwareFiles": []
    }
    
    # Add firmware files info
    for asset in assets:
        if asset.get("name", "").endswith(".uf2") or asset.get("name", "").endswith(".bin"):
            firmware_data["firmwareFiles"].append({
                "name": asset.get("name"),
                "url": asset.get("browser_download_url"),
                "size": asset.get("size"),
                "downloadCount": asset.get("download_count", 0),
                "contentType": asset.get("content_type"),
                "createdAt": asset.get("created_at")
            })
    
    return firmware_data

def save_js_data(firmware_data):
    """Save firmware data as a JavaScript file."""
    js_content = f"""// Auto-generated on {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
const FIRMWARE_DATA = {json.dumps(firmware_data, indent=2)};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {{
    module.exports = {{ FIRMWARE_DATA }};
}} else {{
    window.FIRMWARE_DATA = FIRMWARE_DATA;
}}
"""
    
    with open(JS_OUTPUT_FILE, "w") as f:
        f.write(js_content)
    
    print(f"JavaScript data saved to {JS_OUTPUT_FILE}")

def main():
    try:
        # Create output directory if it doesn't exist
        if not os.path.exists(OUTPUT_DIR):
            os.makedirs(OUTPUT_DIR)
            print(f"Created directory: {OUTPUT_DIR}")
        
        # Fetch latest offline release
        release_data, release_id, tag_name, release_name, release_html_url, release_published_date = fetch_latest_offline_release()
        
        # Fetch assets for this release
        firmware_assets = fetch_release_assets(release_id)
        
        print(f"Found {len(firmware_assets)} firmware files.")
        
        # Generate JavaScript data
        firmware_data = generate_js_data(
            (tag_name, release_name, release_html_url, release_published_date),
            firmware_assets
        )
        
        # Save as JavaScript file
        save_js_data(firmware_data)
        
        print("Process completed successfully.")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
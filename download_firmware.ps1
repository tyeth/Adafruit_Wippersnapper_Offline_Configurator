# PowerShell script to download WipperSnapper offline firmware assets
# This script fetches the latest offline release assets and saves them to a local folder

# Configuration
$Repo = "adafruit/Adafruit_Wippersnapper_Arduino"
$OutputDir = "latest_firmware"
$ReleasesApiUrl = "https://api.github.com/repos/$Repo/releases"
$PerPage = 30  # GitHub API default per page limit

# Create output directory if it doesn't exist
if (-not (Test-Path -Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "Created directory: $OutputDir"
}

Write-Host "Fetching releases information for $Repo..."

try {
    # Use TLS 1.2 for GitHub API
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    # Fetch the releases data with pagination
    $Headers = @{
        "Accept" = "application/vnd.github.v3+json"
    }
    
    $AllReleases = @()
    $Page = 1
    $FoundOfflineRelease = $false
    $LatestOfflineRelease = $null
    
    # Loop through pages until we find an offline release or run out of releases
    do {
        $PageUrl = "$ReleasesApiUrl`?page=$Page&per_page=$PerPage"
        Write-Host "Fetching page $Page of releases..."
        
        $PageReleases = Invoke-RestMethod -Uri $PageUrl -Headers $Headers -ErrorAction Stop
        
        # Add to all releases - ensure we're adding to an array
        if ($PageReleases -is [array]) {
            $AllReleases += $PageReleases
        } else {
            # If it's a single object, wrap it in an array before adding
            $AllReleases += @($PageReleases)
        }
        
        # Check if this page contains any offline releases
        $OfflineReleases = @($PageReleases | Where-Object { $_.tag_name -like "*offline*" })
        
        # Force result to be an array using @() and check count
        $OfflineReleasesCount = @($OfflineReleases).Count
        Write-Host "Found $OfflineReleasesCount offline releases on page $Page"
        
        if ($OfflineReleasesCount -gt 0) {
            $FoundOfflineRelease = $true
            # Get the latest offline release by published date
            $LatestOfflineRelease = $OfflineReleases | 
                                   Sort-Object -Property published_at -Descending | 
                                   Select-Object -First 1
            break
        }
        
        # Move to next page if we didn't find any offline releases and there are more pages
        $Page++
        
        # Stop if we received fewer items than the per_page limit (meaning we're on the last page)
        # Force result to be an array using @() and check count
        $PageReleasesCount = @($PageReleases).Count
        if ($PageReleasesCount -lt $PerPage) {
            Write-Host "Reached the last page with $PageReleasesCount items (less than $PerPage per page)"
            break
        }
    } while (-not $FoundOfflineRelease)
    
    # Check if we found an offline release
    if ($null -eq $LatestOfflineRelease) {
        Write-Host "Error: No offline release found after checking $Page pages of releases."
        exit
    }
    
    $TagName = $LatestOfflineRelease.tag_name
    $ReleaseName = $LatestOfflineRelease.name
    $ReleaseId = $LatestOfflineRelease.id
    
    Write-Host "Found latest offline release: $ReleaseName (Tag: $TagName, ID: $ReleaseId)"
    
    # Fetch the complete assets list directly from the assets URL
    $AssetsUrl = "https://api.github.com/repos/$Repo/releases/$ReleaseId/assets"
    Write-Host "Fetching complete assets list from: $AssetsUrl"
    
    $AllAssets = @()
    $AssetsPage = 1
    
    # Loop through pages to get all assets
    do {
        $AssetsPageUrl = "$AssetsUrl`?page=$AssetsPage&per_page=$PerPage"
        Write-Host "Fetching page $AssetsPage of assets..."
        
        $PageAssets = Invoke-RestMethod -Uri $AssetsPageUrl -Headers $Headers -ErrorAction Stop
        
        # Add to all assets - ensure we're adding to an array
        if ($PageAssets -is [array]) {
            $AllAssets += $PageAssets
        } else {
            # If it's a single object, wrap it in an array before adding
            $AllAssets += @($PageAssets)
        }
        
        # Move to next page if there are more assets
        $AssetsPage++
        
        # Stop if we received fewer items than the per_page limit (meaning we're on the last page)
        # Force result to be an array using @() and check count
        $PageAssetsCount = @($PageAssets).Count
        if ($PageAssetsCount -lt $PerPage) {
            Write-Host "Reached the last page of assets with $PageAssetsCount items"
            break
        }
    } while ($true)
    
    # Filter for UF2 and BIN files
    Write-Host "Filtering for firmware files..."
    $FirmwareAssets = @($AllAssets | Where-Object { $_.name -like "*.uf2" -or $_.name -like "*.bin" })
    
    # Check if we found any assets
    $FirmwareAssetsCount = @($FirmwareAssets).Count
    if ($FirmwareAssetsCount -eq 0) {
        Write-Host "No firmware files (.uf2 or .bin) found in release $TagName."
        exit
    }
    
    Write-Host "Found $FirmwareAssetsCount firmware files to download."
    
    # Download each asset
    foreach ($Asset in $FirmwareAssets) {
        $Name = $Asset.name
        $Url = $Asset.browser_download_url
        $Size = $Asset.size
        $OutputFile = Join-Path -Path $OutputDir -ChildPath $Name
        
        # Check if file already exists
        if (Test-Path -Path $OutputFile) {
            Write-Host "File $Name already exists, checking if it's the same version..."
            
            # Get file info
            $ExistingFile = Get-Item -Path $OutputFile
            
            # Check if file size matches
            if ($ExistingFile.Length -eq $Size) {
                # Calculate SHA256 hash of the existing file
                $FileHash = Get-FileHash -Path $OutputFile -Algorithm SHA256
                
                # Get the remote file's hash by downloading the first few bytes
                try {
                    # First try to get the hash from the GitHub API if available
                    if ($Asset.PSObject.Properties.Name -contains "sha256") {
                        $RemoteHash = $Asset.sha256
                    } else {
                        # If GitHub doesn't provide the hash, we'll compute it from the remote file
                        # This is a temporary file to download the remote file for hash verification
                        $TempFile = [System.IO.Path]::GetTempFileName()
                        
                        # Download the file to temp location
                        Invoke-WebRequest -Uri $Url -OutFile $TempFile -ErrorAction Stop
                        
                        # Calculate hash
                        $RemoteFileHash = Get-FileHash -Path $TempFile -Algorithm SHA256
                        $RemoteHash = $RemoteFileHash.Hash
                        
                        # Remove temp file
                        Remove-Item -Path $TempFile -Force
                    }
                    
                    # Compare hashes
                    if ($FileHash.Hash -eq $RemoteHash) {
                        Write-Host "File $Name is already up to date (hash verified), skipping download."
                        continue
                    } else {
                        Write-Host "File $Name has different hash, downloading new version..."
                    }
                }
                catch {
                    Write-Host "Could not verify hash for $Name, will download again to be safe."
                }
            } else {
                Write-Host "File $Name has different size, downloading new version..."
            }
        } else {
            Write-Host "Downloading $Name..."
        }
        
        # Download the file
        try {
            Invoke-WebRequest -Uri $Url -OutFile $OutputFile -ErrorAction Stop
            Write-Host "Successfully downloaded $Name"
        }
        catch {
            Write-Host "Failed to download $Name. Error: $_"
        }
    }
    
    Write-Host "Download complete. Firmware files saved to $OutputDir\"
    Get-ChildItem -Path $OutputDir | Format-Table Name, Length
}
catch {
    if ($_.Exception.Message -like "*404*") {
        Write-Host "Error: Repository or releases not found."
    }
    elseif ($_.Exception.Message -like "*rate limit*") {
        Write-Host "Error: GitHub API rate limit exceeded. Try again later or use an API token."
    }
    else {
        Write-Host "Error fetching release data: $_"
    }
}

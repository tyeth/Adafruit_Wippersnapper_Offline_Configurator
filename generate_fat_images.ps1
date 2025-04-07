# Generate FAT32 images for Wippersnapper firmware
param(
    [Parameter(Mandatory=$true)]
    [string]$OutputDir,
    
    [Parameter(Mandatory=$true)]
    [int]$SizeMB
)

# Get current timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Create output directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Create a temporary file for the FAT image
$imagePath = Join-Path -Path $OutputDir -ChildPath ("wippersnapper_fat_image_$timestamp.img")

# Create an empty file of the specified size
$sizeBytes = $SizeMB * 1MB
fsutil file createnew $imagePath $sizeBytes

# Create temporary diskpart script
$scriptPath = [System.IO.Path]::GetTempFileName()

# Create the script file content
@"
create vdisk file="$imagePath" maximum=$SizeMB type=fixed
select vdisk file="$imagePath"
attach vdisk
create partition primary
format fs=fat32 quick
assign letter=X
exit
"@ | Out-File -FilePath $scriptPath -Encoding ascii

try {
    # Run diskpart with the script
    diskpart /s $scriptPath
    
    # Wait for drive letter to be assigned
    Start-Sleep -Seconds 1
    
    # Return the image path
    return $imagePath
} finally {
    # Clean up the script file
    Remove-Item $scriptPath -Force
}

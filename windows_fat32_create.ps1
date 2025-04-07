# Create FAT32 image with specified size
param(
    [Parameter(Mandatory=$true)]
    [string]$ImagePath,
    
    [Parameter(Mandatory=$true)]
    [int]$SizeMB
)

# Create an empty file of the specified size
$sizeBytes = $SizeMB * 1MB
fsutil file createnew $ImagePath $sizeBytes

# Create temporary diskpart script
$scriptPath = [System.IO.Path]::GetTempFileName()

# Create the script file content
@"
create vdisk file=$ImagePath maximum=$SizeMB type=fixed
select vdisk file=$ImagePath
attach vdisk
create partition primary
format fs=fat32 quick
assign letter=X
exit
"@ | Out-File -FilePath $scriptPath -Encoding ascii

# Run diskpart with the script
try {
    diskpart /s $scriptPath
    
    # Wait for drive letter to be assigned
    Start-Sleep -Seconds 1
    
    # Now you can copy your files to X:
    # Copy-Item -Path "C:\path\to\your_files\*" -Destination "X:\" -Recurse

    # Return the drive letter
    return "X:"
} finally {
    # Detach the disk
    $detachScript = [System.IO.Path]::GetTempFileName()
@"
select vdisk file=$ImagePath
detach vdisk
exit
"@ | Out-File -FilePath $detachScript -Encoding ascii

    diskpart /s $detachScript
    Remove-Item $detachScript -Force
    # Clean up the script file
    Remove-Item $scriptPath -Force
}
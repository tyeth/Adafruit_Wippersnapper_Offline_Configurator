# Create a fixed-size file to serve as your disk image
$file = "C:\path\to\fat32_image.img"
$size = 1MB  # Adjust size as needed (1MB shown here)

# Create an empty file of the specified size
fsutil file createnew $file $size

# Use diskpart via script file
$diskpartScript = "C:\path\to\diskpart_script.txt"

# Create the script file content
@"
create vdisk file=$file maximum=1 type=fixed
select vdisk file=$file
attach vdisk
create partition primary
format fs=fat32 quick
assign letter=X
exit
"@ | Out-File -FilePath $diskpartScript -Encoding ascii

# Run diskpart with the script
diskpart /s $diskpartScript

# Now you can copy your files to X:
# Copy-Item -Path "C:\path\to\your_files\*" -Destination "X:\" -Recurse

# When done, detach the disk
$detachScript = "C:\path\to\detach_script.txt"
@"
select vdisk file=$file
detach vdisk
exit
"@ | Out-File -FilePath $detachScript -Encoding ascii

diskpart /s $detachScript
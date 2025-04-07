import re
import requests
import traceback


def main():
    """Main function to process all firmware files"""
    global CI_ARDUINO_PARAMS
    
    print("=== Wippersnapper UF2 Firmware and Filesystem Merger ===")
    os.chdir(BASE_DIR)
    print(f"Working directory: {os.getcwd()}")
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Check for arduino-cli
    try:
        result = subprocess.run(["arduino-cli", "version"], capture_output=True, text=True, check=False)
        if result.returncode == 0:
            print(f"Found arduino-cli: {result.stdout.strip()}")
            use_arduino_cli = True
            
            # Update the core index with BSP URLs
            print("Updating arduino-cli core index with BSP URLs...")
            update_cmd = ["arduino-cli", "core", "update-index", "--additional-urls", BSP_URLS]
            subprocess.run(update_cmd, check=False)
        else:
            print("Warning: arduino-cli not found in PATH, will use local paths only")
            use_arduino_cli = False
    except Exception:
        print("Warning: arduino-cli not available, will use local paths only")
        use_arduino_cli = False
    
    # Extract build targets from workflow file
    print("\n=== Extracting build targets from GitHub workflow file ===")
    build_targets = extract_build_targets_from_workflow()
    
    # Try to fetch board-specific parameters from ci-arduino repo
    print("\n=== Fetching board configurations from ci-arduino ===")
    CI_ARDUINO_PARAMS = fetch_ci_arduino_parameters(use_git=True)
    if CI_ARDUINO_PARAMS:
        print(f"Found {len(CI_ARDUINO_PARAMS)} board configurations from ci-arduino")
    else:
        print("Warning: Could not fetch configurations from ci-arduino")
    
    # Find all UF2 firmware files
    print("\n=== Scanning for firmware files ===")
    fw_files = list(FIRMWARE_DIR.glob("*.uf2"))
    if not fw_files:
        print(f"No UF2 firmware files found in {FIRMWARE_DIR}")
        return
    
    print(f"Found {len(fw_files)} firmware files")
    
    # Process each firmware file
    print("\n=== Processing firmware files ===")
    for fw_file in fw_files:
        try:
            print(f"\nProcessing: {fw_file.name}")
            process_firmware_file(fw_file)
        except Exception as e:
            print(f"Error processing {fw_file}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n=== Processing complete! ===")
    print(f"Merged firmware files are in: {OUTPUT_DIR}")

import os
import sys
import subprocess
import tempfile
import shutil
import hashlib
import json
import glob
from pathlib import Path
from datetime import datetime

# Constants
BASE_DIR = Path(r"C:\dev\arduino\Adafruit_Wippersnapper_Offline_Configurator")
OUTPUT_DIR = BASE_DIR / "merged_firmware"
FIRMWARE_DIR = BASE_DIR / "latest_firmware"
DEFAULT_FAT_SIZE = 1024 * 1024  # Default 1MB FAT partition, will be overridden by board-specific values
OFFLINE_FILES = ["offline.js", "offline.html"]

# Dictionary of common partition sizes from Arduino ESP32 board definitions
# These sizes need to match exactly what's defined in the board's partition table
PARTITION_SIZES = {
    "default": DEFAULT_FAT_SIZE,
    "default_16MB": 0xC00000,  # 12MB for fat when using the default_16MB partition scheme
    "large_spiffs": 0x290000,  # ~2.6MB fat partition in large_spiffs scheme
    "huge_app": 0x120000,      # ~1.1MB fat partition in huge_app scheme
    "min_spiffs": 0x40000,     # 256KB fat partition in min_spiffs scheme
    "custom_fat": 0x400000,    # 4MB fat partition for custom partition schemes
    "tinyuf2_noota": 0xF0000   # 960KB fat partition in tinyuf2-partitions-4MB-noota.csv
}

# GitHub URLs for ESP32 Arduino core
ESP32_BOARDS_TXT_URL = "https://raw.githubusercontent.com/espressif/arduino-esp32/master/boards.txt"
ESP32_PARTITIONS_BASE_URL = "https://raw.githubusercontent.com/espressif/arduino-esp32/master/tools/partitions/"
ESP32_GITHUB_API_PARTITIONS_URL = "https://api.github.com/repos/espressif/arduino-esp32/contents/tools/partitions"

# BSP URLs from ci-arduino
BSP_URLS = (
    "https://adafruit.github.io/arduino-board-index/package_adafruit_index.json,"
    "http://arduino.esp8266.com/stable/package_esp8266com_index.json,"
    "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_dev_index.json,"
    "https://sandeepmistry.github.io/arduino-nRF5/package_nRF5_boards_index.json,"
    "https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json,"
    "https://drazzy.good-enough.cloud/package_drazzy.com_index.json,"
    "https://github.com/openwch/board_manager_files/raw/main/package_ch32v_index.json"
)

# Global variable to store ci-arduino parameters
CI_ARDUINO_PARAMS = {}

# Platform-specific parameters
PLATFORM_PARAMS = {
    "RP2040": {
        "family": "RP2040",
        "fat_base_addr": 0x10100000,  # Example, would need to be adjusted per target
        "uf2_family_id": "0xe48bff56"  # RP2040 family ID for RP2040/RP2350/etc
    },
    "ESP32": {
        "family": "ESP32",
        "fat_base_addr": 0x310000,  # Example, would need to be adjusted per target
        "partition_size": DEFAULT_FAT_SIZE
    }
}

# Map of board identifiers to detect specific target properties
# This could be expanded based on the ci-arduino/all_platforms.py information
BOARD_SPECIFIC_PARAMS = {
    # ESP32-S2 boards might have different partition layouts
    "esp32s2": {
        "platform": "ESP32",
        "fat_base_addr": 0x310000  # Adjust as needed
    },
    # ESP32-S3 boards
    "esp32s3": {
        "platform": "ESP32",
        "fat_base_addr": 0x310000  # Adjust as needed
    },
    # RP2350 might have specific settings
    "rp2350": {
        "platform": "RP2040",
        "fat_base_addr": 0x10100000  # Adjust as needed
    }
    # Add more board-specific configurations as needed
}

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_fat_image(fat_img_path, files_to_include, fat_size):
    """Create a FAT32 image containing the specified files"""
    try:
        # Generate the PowerShell script
        script_path = generate_image_generation_script(
            os.path.dirname(fat_img_path),
            int(fat_size/1024/1024)
        )
        
        print(f"Generated PowerShell script: {script_path}")
        
        # Run the PowerShell script to generate the image
        cmd = f'powershell -File "{script_path}"'
        
        # Execute the command
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        # Get the image path from the output
        if result.returncode != 0:
            print(f"Error generating FAT32 image: {result.stderr}")
            return None
            
        image_path = result.stdout.strip()
        if not image_path:
            print("Error: No image path returned from PowerShell script")
            return None
        
        # Mount the image using diskpart
        mount_script = ["select vdisk file=\"{}\"".format(image_path),
                       "attach vdisk",
                       "assign letter=X",
                       "exit"]
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as mount_file:
            mount_file.write('\n'.join(mount_script).encode())
            mount_file.flush()
            
            # Run diskpart to mount the image
            subprocess.run(["diskpart", "/s", mount_file.name], check=True)
        
        # Copy files to the mounted drive
        for file_path in files_to_include:
            src_path = BASE_DIR / file_path
            dest_path = Path(f"X:/") / os.path.basename(file_path)
            shutil.copy2(src_path, dest_path)
            print(f"Copied {src_path} to {dest_path}")
        
        # Unmount the image
        unmount_script = ["select vdisk file=\"{}\"".format(image_path),
                         "detach vdisk",
                         "exit"]
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as unmount_file:
            unmount_file.write('\n'.join(unmount_script).encode())
            unmount_file.flush()
            
            # Run diskpart to unmount the image
            subprocess.run(["diskpart", "/s", unmount_file.name], check=True)
        
        # Copy the final image to the desired location
        shutil.copy2(image_path, fat_img_path)
        
        return fat_img_path
            
    except Exception as e:
        print(f"Error creating FAT image: {e}")
        return None

def generate_image_generation_script(output_dir, image_size_mb):
    """
    Generate a PowerShell script that will create multiple FAT32 images
    
    Args:
        output_dir: Directory where images will be created
        image_size_mb: Size of each image in megabytes
        
    Returns:
        Path to the generated PowerShell script
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    script_path = os.path.join(output_dir, f"generate_images_{timestamp}.ps1")
    
    with open(script_path, 'w') as f:
        f.write("""
# Function to create a single FAT32 image
function Create-FatImage {
    param(
        [string]$ImagePath,
        [int]$SizeMB
    )
    
    # Create empty file
    $sizeBytes = $SizeMB * 1MB
    fsutil file createnew $ImagePath $sizeBytes
    
    # Create temporary diskpart script
    $scriptPath = [System.IO.Path]::GetTempFileName()
    
    # Create the script file content
    @"
    create vdisk file="$ImagePath" maximum=$SizeMB type=fixed
    select vdisk file="$ImagePath"
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
        return $ImagePath
    } finally {
        # Clean up the script file
        Remove-Item $scriptPath -Force
    }
}

# Main script execution
try {
    # Create output directory if it doesn't exist
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    }
    
    # Create FAT32 image
    $imagePath = Join-Path -Path $outputDir -ChildPath ("wippersnapper_fat_image_$timestamp.img")
    Create-FatImage -ImagePath $imagePath -SizeMB $SizeMB
    
    # Return the image path
    Write-Output $imagePath
} catch {
    Write-Error "Error creating FAT32 image: $_"
    exit 1
}
""".format(output_dir=output_dir, SizeMB=image_size_mb))
    
    return script_path

def convert_to_uf2(img_path, platform_type, output_path, base_addr, uf2conv_script):
    """Convert raw image to UF2 format"""
    # Build the command based on platform
    if platform_type == "RP2040":
        cmd = [
            "python", str(uf2conv_script),
            "--base", hex(base_addr),
            "--family", PLATFORM_PARAMS[platform_type]["uf2_family_id"],
            "--output", output_path,
            img_path
        ]
    else:  # ESP32
        cmd = [
            "python", str(uf2conv_script),
            "--base", hex(base_addr),
            "--family", PLATFORM_PARAMS[platform_type]["uf2_family_id"],
            "--output", output_path,
            img_path
        ]
    
    print(f"Running command: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True)
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"Error running uf2conv.py: {e}")
        print(f"Command output: {e.output}")
        return None

def merge_uf2_files(fw_uf2, fs_uf2, output_path):
    """Merge firmware and filesystem UF2 files"""
    # For simplicity we'll just concatenate the files
    # In a production environment, you might want a proper UF2 merger
    with open(output_path, 'wb') as outfile:
        for infile in [fw_uf2, fs_uf2]:
            with open(infile, 'rb') as f:
                outfile.write(f.read())
    
    return output_path

def process_firmware_file(fw_path):
    """
    Process a single firmware file
    """
    fw_name = os.path.basename(fw_path)
    print(f"Processing firmware: {fw_name}")
    
    # Extract board ID from firmware name
    board_id = extract_board_id_from_filename(fw_name)
    if not board_id:
        print(f"Warning: Could not extract board ID from {fw_name}")
        return None
    
    # Determine platform type based on board ID
    if board_id.startswith(('esp32', 'esp32s2', 'esp32s3')):
        platform_type = "ESP32"
    elif board_id.startswith(('rp2040', 'rp2350', 'rp2')):
        platform_type = "RP2040"
    else:
        print(f"Warning: Could not determine platform type for {board_id}, assuming RP2040")
        platform_type = "RP2040"
    
    print(f"Detected platform: {platform_type}")
    print(f"Board ID: {board_id}")
    
    # Create output directory if it doesn't exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Determine output filename
    output_filename = fw_name.replace(".uf2", f"_{board_id}_with_fs.uf2")
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    # Process the firmware file
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create FAT image
        fat_img_path = os.path.join(temp_dir, f"fat32_{board_id}.img")
        
        # Get board-specific parameters
        fat_size, fat_base_addr = get_board_fat_parameters(fw_name, platform_type)
        
        create_fat_image(fat_img_path, OFFLINE_FILES, fat_size)
        
        # Convert FAT image to UF2
        uf2conv_script = locate_uf2conv_script()
        if not uf2conv_script:
            print("Error: Could not locate uf2conv.py script")
            return None
        
        fs_uf2_path = os.path.join(temp_dir, f"filesystem_{board_id}.uf2")
        convert_to_uf2(fat_img_path, platform_type, fs_uf2_path, fat_base_addr, uf2conv_script)
        
        # Merge firmware UF2 with filesystem UF2
        merge_uf2_files(fw_path, fs_uf2_path, output_path)
        
        print(f"Created merged firmware: {output_path}")
    
    return output_path

def get_board_fat_parameters(fw_name, platform_type):
    """
    Get the FAT size and base address for the board based on the firmware file name and platform type
    """
    # Default values
    fat_size = DEFAULT_FAT_SIZE
    fat_base_addr = PLATFORM_PARAMS[platform_type]["fat_base_addr"]
    
    # For ESP32 boards, try to get more accurate parameters
    if platform_type == "ESP32":
        # Extract board ID from firmware name
        board_id = extract_board_id_from_filename(fw_name)
        if board_id:
            # Try to get FQBN for the board
            fqbn = f"esp32:esp32:{board_id}"
            
            # Fetch board info from GitHub
            board_info = fetch_board_info_from_github(board_id)
            if board_info:
                # Get flash size
                flash_size = board_info.get("flash_size")
                
                # Get partition scheme
                partition_scheme = board_info.get("default_partition")
                
                if partition_scheme and "tinyuf2" in partition_scheme.lower():
                    # This is a TinyUF2 partition, get the parameters from the partition file
                    partition_file = locate_partition_file(partition_scheme)
                    if partition_file:
                        fat_params = parse_fat_parameters_from_partition(partition_file)
                        if fat_params:
                            fat_size = fat_params["size"]
                            fat_base_addr = fat_params["offset"]
                elif flash_size:
                    # Try to find a TinyUF2 partition that matches the flash size
                    tinyuf2_partition = find_matching_tinyuf2_partition(flash_size)
                    if tinyuf2_partition:
                        fat_params = parse_fat_parameters_from_partition(tinyuf2_partition)
                        if fat_params:
                            fat_size = fat_params["size"]
                            fat_base_addr = fat_params["offset"]
    
    print(f"Using FAT size: {fat_size} bytes, base address: 0x{fat_base_addr:X}")
    return fat_size, fat_base_addr

def extract_board_id_from_filename(fw_name):
    """
    Extract a board ID from the firmware filename that matches the format used in boards.txt
    
    Args:
        fw_name: The firmware filename
        
    Returns:
        The board ID as it appears in boards.txt, or None if not found
    """
    # First try to get the exact board name from the filename
    # Split on dots and take the second part (after wippersnapper and before version)
    parts = fw_name.split('.')
    if len(parts) >= 2:
        board_name = parts[1]
        # Convert to lowercase and replace underscores with hyphens to match boards.txt format
        board_id = board_name.lower().replace('_', '-')
        
        # Special case for feather boards since they use feather-esp32s2 in boards.txt
        if board_id.startswith('feather-esp32s2'):
            return 'feather-esp32s2'
        elif board_id.startswith('feather-esp32s3'):
            return 'feather-esp32s3'
        
        # For other boards, return the converted name
        return board_id
    
    return None

def parse_fat_parameters_from_partition(partition_file):
    """
    Parse the FAT partition parameters from a partition CSV file
    """
    try:
        with open(partition_file, 'r') as f:
            lines = f.readlines()
            
        # Print the header and first few lines for debugging
        print("\nPartition CSV contents:")
        for line in lines[:5]:  # Print first 5 lines
            print(line.strip())
        
        # Parse the CSV to find the FAT partition
        fat_offset = None
        fat_size = None
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 5:
                name, type_val, subtype, offset, size = parts[:5]
                print(f"\nProcessing partition row: {parts}")  # Debug print
                print(f"Name: {name}, Type: {type_val}, Subtype: {subtype}, Offset: {offset}, Size: {size}")
                
                # Look for the FAT partition (could be named ffat, fat, spiffs, etc.)
                if (type_val.lower() == "data" and 
                    (subtype.lower() == "fat" or "fat" in name.lower() or 
                     "ffat" in name.lower() or "spiffs" in name.lower())):
                    
                    # Convert offset and size to integers
                    try:
                        if offset.startswith("0x"):
                            fat_offset = int(offset, 16)
                            print(f"Offset converted from hex: 0x{offset} -> {fat_offset}")
                        else:
                            try:
                                fat_offset = int(offset)
                                print(f"Offset converted from decimal: {offset} -> {fat_offset}")
                            except ValueError:
                                print(f"Warning: Could not convert offset '{offset}' to integer, skipping")
                                continue
                            
                        if size.endswith("K"):
                            fat_size = int(size[:-1]) * 1024
                            print(f"Size converted from K: {size} -> {fat_size} bytes")
                        elif size.endswith("M"):
                            fat_size = int(size[:-1]) * 1024 * 1024
                            print(f"Size converted from M: {size} -> {fat_size} bytes")
                        elif size.endswith(","):
                            # Remove trailing comma
                            size = size[:-1]
                            if "K" in size:
                                fat_size = int(size.replace("K", "")) * 1024
                                print(f"Size converted from K with comma: {size} -> {fat_size} bytes")
                            elif "M" in size:
                                fat_size = int(size.replace("M", "")) * 1024 * 1024
                                print(f"Size converted from M with comma: {size} -> {fat_size} bytes")
                            else:
                                try:
                                    fat_size = int(size)
                                    print(f"Size converted from decimal: {size} -> {fat_size} bytes")
                                except ValueError:
                                    print(f"Warning: Could not convert size '{size}' to integer, skipping")
                                    continue
                        else:
                            try:
                                fat_size = int(size)
                                print(f"Size converted from decimal: {size} -> {fat_size} bytes")
                            except ValueError:
                                print(f"Warning: Could not convert size '{size}' to integer, skipping")
                                continue
                            
                        print(f"Found FAT partition: offset={hex(fat_offset)}, size={fat_size} bytes")
                        return {"offset": fat_offset, "size": fat_size}
                    except ValueError as e:
                        print(f"Error converting offset/size: {e}")
                        continue
        
        print("No FAT partition found in CSV file")
        return None
    except Exception as e:
        print(f"Error parsing partition file: {e}")
        return None

def fetch_workflow_file_from_github():
    """
    Fetch the workflow file from GitHub API from https://github.com/adafruit/Adafruit_Wippersnapper_Arduino/blob/offline-mode/.github/workflows/release-offline.yml
    """
    try:
        import requests
        response = requests.get("https://raw.githubusercontent.com/adafruit/Adafruit_Wippersnapper_Arduino/offline-mode/.github/workflows/release-offline.yml")
        if response.status_code == 200:
            return response.text
        else:
            print(f"Failed to fetch workflow file: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error fetching workflow file: {e}")
        return None

def extract_build_targets_from_workflow(workflow_file_path=None):
    """
    Extract build targets from the GitHub Actions workflow file
    """
    try:
        # fetch workflow file from git api
        if workflow_file_path is None:
            workflow_content = fetch_workflow_file_from_github()
            if workflow_content is None:
                print("Warning: Could not fetch workflow file")

                # If no workflow file is provided, try to find it
                if workflow_file_path is None:
                    
                    potential_paths = [
                        Path(r"C:\dev\arduino\Adafruit_Wippersnapper_Arduino\.github\workflows\release-offline.yml"),
                        Path(r".github\workflows\release-offline.yml"),
                        Path(r"..\.github\workflows\release-offline.yml")
                    ]
                    
                    for path in potential_paths:
                        if path.exists():
                            workflow_file_path = path
                            break



                            
                    if workflow_file_path is None:
                        print("Warning: Could not find workflow file")
                        return []
                
                # Read the workflow file
                with open(workflow_file_path, 'r') as f:
                    workflow_content = f.read()
        
        # Extract build matrix for ESP32-SX
        import re
        esp32_matrix = re.search(r'build-esp32sx:.*?matrix:.*?arduino-platform:.*?\[(.*?)\]', 
                                workflow_content, re.DOTALL)
        
        # Extract build matrix for RP2040
        rp2040_matrix = re.search(r'build-rp2040:.*?matrix:.*?arduino-platform:.*?\[(.*?)\]', 
                                 workflow_content, re.DOTALL)
        
        build_targets = []
        
        if esp32_matrix:
            # Parse the ESP32 matrix entries
            esp32_platforms = esp32_matrix.group(1).strip()
            # Extract quoted strings
            esp32_targets = re.findall(r'"([^"]+)"', esp32_platforms)
            build_targets.extend(esp32_targets)
        
        if rp2040_matrix:
            # Parse the RP2040 matrix entries
            rp2040_platforms = rp2040_matrix.group(1).strip()
            # Extract quoted strings
            rp2040_targets = re.findall(r'"([^"]+)"', rp2040_platforms)
            build_targets.extend(rp2040_targets)
        
        print(f"Found {len(build_targets)} build targets in workflow file:")
        for target in build_targets:
            print(f"  - {target}")
            
        return build_targets
        
    except Exception as e:
        print(f"Error extracting build targets from workflow: {e}")
        import traceback
        traceback.print_exc()
        return []

def locate_partition_file(partition_name, fqbn=None):
    """
    Locate the partition CSV file based on name in various Arduino BSP directories
    """
    # First try using arduino-cli if FQBN is provided
    if fqbn:
        cli_partition_file = locate_arduino_cli_partition_file(fqbn, partition_name)
        if cli_partition_file:
            return cli_partition_file
    
    # If no partition name is provided or not found, and it's an ESP32 board,
    # try to find a TinyUF2 partition by fetching boards.txt from GitHub
    if (not partition_name or partition_name.lower() == "default") and fqbn and "esp32" in fqbn.lower():
        print(f"No specific partition scheme found, looking for TinyUF2 partition for ESP32...")
        
        # Extract board ID from FQBN
        fqbn_parts = fqbn.split(':')
        if len(fqbn_parts) >= 3:
            vendor, arch, board_id = fqbn_parts[:3]
            
            # Fetch board info from GitHub
            board_info = fetch_board_info_from_github(board_id)
            if board_info:
                flash_size = board_info.get("flash_size")
                if flash_size:
                    print(f"Detected flash size from boards.txt: {flash_size}MB")
                
                # Check if a specific partition scheme is specified in the FQBN
                partition_scheme = None
                if len(fqbn_parts) > 3 and '=' in fqbn_parts[3]:
                    params = fqbn_parts[3].split(',')
                    for param in params:
                        if '=' in param:
                            key, value = param.split('=', 1)
                            if key == 'PartitionScheme':
                                partition_scheme = value
                                break
                
                # If no specific scheme in FQBN, use the default from boards.txt
                if not partition_scheme:
                    partition_scheme = board_info.get("default_partition")
                
                if partition_scheme:
                    print(f"Using partition scheme: {partition_scheme}")
                    
                    # Check if this is a TinyUF2 partition or filter for TinyUF2 partitions
                    if "tinyuf2" in partition_scheme.lower():
                        # This is already a TinyUF2 partition, fetch it
                        partition_file = fetch_partition_file_from_github(partition_scheme)
                        if partition_file:
                            return partition_file
                    else:
                        # Try to find a TinyUF2 partition that matches the flash size
                        tinyuf2_partition = find_matching_tinyuf2_partition(flash_size)
                        if tinyuf2_partition:
                            return tinyuf2_partition
    
    # Then try local paths
    potential_paths = [
        # ESP32 Arduino core
        Path(r"C:\dev\arduino\arduino-esp32\tools\partitions"),
        # User's Arduino15 folder - we can't access this directly due to permissions,
        # but we can look in known locations in accessible directories
        Path(r"C:\dev\arduino\Adafruit_Wippersnapper_Arduino\tools\partitions"),
        Path(r"C:\dev\arduino\tinyuf2\ports\esp32s2\boards\adafruit_feather_esp32s2\partitions"),
        # CI-Arduino repo
        Path(r"C:\dev\arduino\ci-arduino\partitions")
    ]
    
    for base_path in potential_paths:
        if not base_path.exists():
            continue
            
        # Try exact name match
        exact_path = base_path / f"{partition_name}.csv"
        if exact_path.exists():
            print(f"Found partition file in local path: {exact_path}")
            return exact_path
            
        # Try case-insensitive search
        for file_path in base_path.glob("*.csv"):
            if file_path.stem.lower() == partition_name.lower():
                print(f"Found partition file in local path (case-insensitive): {file_path}")
                return file_path
    
    print(f"Warning: Could not find partition file for {partition_name}")
    return None

def find_tinyuf2_partition_for_board(boards_path, board_id):
    """
    Find a TinyUF2 partition for the given board ID by parsing boards.txt
    """
    try:
        with open(boards_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                # Check if this is the board we're looking for
                if line.startswith(board_id + '.name='):
                    # Look for the build.partitions parameter
                    for line in f:
                        line = line.strip()
                        if line.startswith(board_id + '.build.partitions='):
                            partition_name = line.split('=')[1]
                            if partition_name.startswith('tinyuf2'):
                                # Avoid OTA versions by default
                                if 'ota' not in partition_name.lower():
                                    return locate_partition_file(partition_name)
    except Exception as e:
        print(f"Error finding TinyUF2 partition for board {board_id}: {e}")
        return None

def locate_arduino_cli_partition_file(fqbn, partition_name):
    """
    Use arduino-cli to locate partition files from installed platforms
    """
    try:
        # Parse FQBN to get package, architecture
        fqbn_parts = fqbn.split(":")
        if len(fqbn_parts) < 3:
            print(f"Warning: Invalid FQBN format: {fqbn}")
            return None
            
        package, architecture = fqbn_parts[0], fqbn_parts[1]
        
        # Get arduino-cli config to find package paths
        result = subprocess.run(
            ["arduino-cli", "config", "dump", "--format", "json"],
            capture_output=True, text=True, check=False
        )
        
        if result.returncode != 0 or result.stdout == '{\n  "config": {}\n}\n':
            print(f"Warning: arduino-cli config failed: {result.stderr}")
            if package == "espressif":
                package = "esp32"
            # Try to install the core if it's not found
            print(f"Attempting to install core {package}:{architecture} with BSP URLs: {BSP_URLS}")
            install_cmd = [
                "arduino-cli", "core", "install", 
                f"{package}:{architecture}", 
                "--additional-urls", BSP_URLS
            ]
            install_result = subprocess.run(install_cmd, capture_output=True, text=True, check=False)
            
            if install_result.returncode != 0:
                print(f"Warning: Failed to install core: {install_result.stderr}")
                return None
                
            # Try getting config again
            result = subprocess.run(
                ["arduino-cli", "config", "dump", 
                "--additional-urls", BSP_URLS, "--format", "json"],
                capture_output=True, text=True, check=False
            )
            
            if result.returncode != 0:
                print(f"Warning: arduino-cli config still failed after core install: {result.stderr}")
                return None
        
        config = json.loads(result.stdout)
        
        # Extract data directory where packages are installed
        data_dir = config.get("directories", {}).get("data", None)
        if not data_dir:
            print("Warning: Could not find arduino-cli data directory")
            return None
        
        # Construct path to partition files
        # Typical path is: <data_dir>/packages/<package>/hardware/<architecture>/<version>/tools/partitions/
        package_dir = Path(data_dir) / "packages" / package
        
        # Find the latest version directory
        hw_dir = package_dir / "hardware" / architecture
        if not hw_dir.exists():
            print(f"Warning: Hardware directory not found: {hw_dir}")
            return None
            
        # Get latest version directory
        versions = sorted([d for d in hw_dir.iterdir() if d.is_dir()], 
                           key=lambda x: [int(p) if p.isdigit() else p for p in x.name.split('.')],
                           reverse=True)
        
        if not versions:
            print(f"Warning: No versions found in {hw_dir}")
            return None
            
        latest_version = versions[0]
        
        # Check for partitions directory
        partitions_dir = latest_version / "tools" / "partitions"
        if not partitions_dir.exists():
            print(f"Warning: Partitions directory not found: {partitions_dir}")
            return None
            
        # Look for the partition file
        partition_file = partitions_dir / f"{partition_name}.csv"
        if partition_file.exists():
            print(f"Found partition file via arduino-cli: {partition_file}")
            return partition_file
            
        # Try case-insensitive search
        for file_path in partitions_dir.glob("*.csv"):
            if file_path.stem.lower() == partition_name.lower():
                print(f"Found partition file via arduino-cli (case-insensitive): {file_path}")
                return file_path
                
        print(f"Warning: Partition file {partition_name}.csv not found in {partitions_dir}")
        return None
            
    except Exception as e:
        print(f"Error locating arduino-cli partition file: {e}")
        return None

def clone_or_update_ci_arduino():
    """
    Clone or update the ci-arduino repository from the specified branch
    """
    try:
        ci_arduino_path = Path("ci-arduino")
        
        # Check if the directory exists
        if ci_arduino_path.exists() and ci_arduino_path.is_dir():
            print("Updating existing ci-arduino repository...")
            subprocess.run(
                ["git", "fetch", "origin"],
                cwd=str(ci_arduino_path),
                check=True
            )
            subprocess.run(
                ["git", "checkout", "ci-wippersnapper"],
                cwd=str(ci_arduino_path),
                check=True
            )
            subprocess.run(
                ["git", "pull", "origin", "ci-wippersnapper"],
                cwd=str(ci_arduino_path),
                check=True
            )
        else:
            print("Cloning ci-arduino repository...")
            subprocess.run(
                ["git", "clone", "https://github.com/adafruit/ci-arduino.git", "-b", "ci-wippersnapper"],
                check=True
            )
        
        print("ci-arduino repository is ready")
        return True
    except Exception as e:
        print(f"Error setting up ci-arduino repository: {e}")
        return False

def fetch_ci_arduino_parameters(use_git=True):
    """
    Fetch board-specific parameters from the ci-arduino repository including FQBN and partition scheme
    """
    try:
        # If use_git is True, try to clone/update the repository first
        if use_git:
            clone_success = clone_or_update_ci_arduino()
            if clone_success:
                ci_arduino_path = "ci-arduino"
            else:
                print("Falling back to local path...")
                ci_arduino_path = os.environ.get("CI_ARDUINO_PATH", "../ci-arduino")
        else:
            ci_arduino_path = os.environ.get("CI_ARDUINO_PATH", "../ci-arduino")
        
        platforms_file = Path(ci_arduino_path) / "all_platforms.py"
        
        if not platforms_file.exists():
            print(f"Warning: Could not find ci-arduino platforms file at {platforms_file}")
            return {}
        
        # First, get the build targets from the workflow file
        build_targets = extract_build_targets_from_workflow()
        build_targets_set = set(build_targets)
        
        # Parse the platforms file to extract FQBN and partition information
        board_params = {}
        with open(platforms_file, 'r') as f:
            content = f.read()
            
        # Extract the ALL_PLATFORMS dictionary
        import re
        platforms_match = re.search(r'ALL_PLATFORMS\s*=\s*{(.*?)}', content, re.DOTALL | re.MULTILINE)
        if not platforms_match:
            print("Warning: Could not find ALL_PLATFORMS dictionary in the file")
            return {}
            
        platforms_content = platforms_match.group(1)
        
        # Parse board entries
        board_entries = re.findall(r'["\']([\w\d_]+)["\'][\s]*:[\s]*\[(.*?)\]', platforms_content, re.DOTALL)
        
        for board_name, board_config in board_entries:
            # Skip all platform groupings
            if board_name in ["main_platforms", "arcada_platforms", "wippersnapper_platforms", "rp2040_platforms"]:
                continue
            
            # Only process boards explicitly mentioned in build targets
            if board_name in build_targets_set:
                # Direct match with a build target
                process_platform_entry(board_name, board_config, board_params)
        
        return board_params
    except Exception as e:
        print(f"Error fetching ci-arduino parameters: {e}")
        import traceback
        traceback.print_exc()
        return {}

def process_platform_entry(board_name, board_config, board_params):
    """Process a single platform entry from the ALL_PLATFORMS dictionary"""
    # Extract FQBN
    fqbn_match = re.search(r'["\']([^"\']+?:[^"\']+?:[^"\']+?(?::[^"\']+?)?)["\']', board_config)
    if fqbn_match:
        fqbn = fqbn_match.group(1)
        
        # Check for custom core URL in ALL_PLATFORMS
        core_url_match = re.search(r'None,\s*["\']([^"\']+?)["\']', board_config)
        custom_core_url = None
        if core_url_match:
            custom_core_url = core_url_match.group(1)
        
        # Parse FQBN for partition scheme
        partition_scheme = parse_fqbn_for_partition(fqbn)
        
        # If we found a partition scheme, look for the CSV file
        fat_size = DEFAULT_FAT_SIZE
        fat_offset = None
        
        if partition_scheme:
            if isinstance(partition_scheme, dict):
                # Handle RP2040 special case
                fat_size = partition_scheme.get("fat_size", DEFAULT_FAT_SIZE)
            else:
                # For ESP32, find and parse the partition file
                partition_file = locate_partition_file(partition_scheme, fqbn)
                if partition_file:
                    fat_info = parse_partition_csv(partition_file)
                    if fat_info["size"]:
                        fat_size = fat_info["size"]
                    if fat_info["offset"]:
                        fat_offset = fat_info["offset"]
        # If no partition scheme was found but it's an ESP32 board, try to use TinyUF2 partition
        elif "esp32" in fqbn.lower():
            print(f"No partition scheme found for {board_name}, trying to use TinyUF2 partition...")
            partition_file = locate_partition_file(None, fqbn)
            if partition_file:
                fat_info = parse_partition_csv(partition_file)
                if fat_info["size"]:
                    fat_size = fat_info["size"]
                if fat_info["offset"]:
                    fat_offset = fat_info["offset"]
                # Use tinyuf2_noota as the partition scheme name for reference
                partition_scheme = "tinyuf2_noota"
            else:
                # If no TinyUF2 partition found, use default ESP32 values from PARTITION_SIZES
                fat_size = PARTITION_SIZES.get("tinyuf2_noota", DEFAULT_FAT_SIZE)
                print(f"No TinyUF2 partition file found, using default size: {fat_size/1024/1024:.2f}MB")
        
        board_params[board_name.lower()] = {
            "fqbn": fqbn,
            "partition_scheme": partition_scheme,
            "fat_size": fat_size,
            "fat_base_addr": fat_offset if fat_offset is not None else 
                          (0x310000 if "esp32" in fqbn.lower() else 0x10100000),
            "custom_core_url": custom_core_url
        }
        print(f"Found board config for {board_name}: FQBN={fqbn}, Partition={partition_scheme}, "
              f"FAT size={fat_size/1024/1024:.2f}MB, FAT offset={hex(board_params[board_name.lower()]['fat_base_addr'])}")
    
def parse_fqbn_for_partition(fqbn):
    """
    Parse FQBN string to extract partition scheme
    FQBN format is typically: vendor:architecture:board:param1=value1,param2=value2,...
    """
    if not fqbn:
        return None
        
    parts = fqbn.split(':')
    if len(parts) < 3:
        return None
        
    # Check if there are parameters
    if len(parts) > 3 and '=' in parts[3]:
        params = parts[3].split(',')
        for param in params:
            if '=' in param:
                key, value = param.split('=', 1)
                if key.lower() == 'partitionscheme':
                    return value
    
    # Check specifically for some known patterns
    board_name = parts[2].lower()
    if "esp32" in board_name:
        # For ESP32 boards without explicit partition scheme, check if it's a known one
        if "s2" in board_name or "s3" in board_name:
            return "default"  # Most S2/S3 boards use default partition
        elif "c3" in board_name or "c6" in board_name:
            return "min_spiffs"  # C3/C6 often use min_spiffs
            
    # For RP2040 boards, there's no standard partition scheme in the FQBN
    # but we can look for flash size indicators
    if "rp2040" in board_name or "rp2350" in board_name or "rp2" in board_name:
        # Check if there's a flash parameter
        if len(parts) > 3:
            params = parts[3].split(',')
            for param in params:
                if 'flash=' in param:
                    flash_param = param.split('=')[1]
                    # Format is typically total_offset
                    flash_values = flash_param.split('_')
                    if len(flash_values) > 0:
                        try:
                            total_flash = int(flash_values[0])
                            # Calculate usable filesystem size (conservative estimate)
                            # Typically 25% of flash is used for filesystem in RP2040
                            return {"flash_size": total_flash, "fat_size": total_flash // 4}
                        except ValueError:
                            pass
    
    return None

def parse_partition_csv_claude(partition_file_path):
    """
    Parse an ESP32 partition CSV file to extract the FAT partition size and offset
    """
    try:
        with open(partition_file_path, 'r') as f:
            lines = f.readlines()
        
        fat_info = {"size": None, "offset": None, "name": None}
        
        for line in lines:
            line = line.strip()
            if line.startswith('#') or not line:
                continue
                
            parts = [p.strip() for p in line.split(',')]
            if len(parts) < 5:
                continue
                
            name, type_, subtype, offset, size = parts[:5]
            # Look for FAT/SPIFFS/FFat partitions
            if (type_.lower() == 'data' and 
                subtype.lower() in ['fat', 'spiffs', 'ffat']):
                
                fat_info["name"] = name
                
                # Parse the offset
                offset_str = offset.strip()
                if offset_str.startswith('0x'):
                    fat_info["offset"] = int(offset_str, 16)
                else:
                    try:
                        fat_info["offset"] = int(offset_str)
                    except ValueError:
                        # Some partition tables use empty offset which means "next available"
                        fat_info["offset"] = None
                
                # Parse the size
                size_str = size.strip()
                if not size_str:  # Empty size means "rest of flash"
                    fat_info["size"] = None
                elif size_str.lower().endswith('k'):
                    fat_info["size"] = int(size_str[:-1]) * 1024
                elif size_str.lower().endswith('m'):
                    fat_info["size"] = int(size_str[:-1]) * 1024 * 1024
                elif size_str.startswith('0x'):
                    fat_info["size"] = int(size_str, 16)
                else:
                    fat_info["size"] = int(size_str)
                
                if fat_info["size"]:
                    print(f"Found FAT partition in CSV: {name}, size: {fat_info['size'] / 1024 / 1024:.2f}MB, offset: {hex(fat_info['offset']) if fat_info['offset'] else 'auto'}")
                else:
                    print(f"Found FAT partition in CSV: {name}, size: auto, offset: {hex(fat_info['offset']) if fat_info['offset'] else 'auto'}")
                
                return fat_info
        
        return fat_info
    except Exception as e:
        print(f"Error parsing partition CSV: {e}")
        return {"size": None, "offset": None, "name": None}

def parse_partition_csv(partition_file_path):
    c = parse_partition_csv_claude(partition_file_path)
    if c is not None:
        return c
    return None

def fetch_board_info_from_github(board_id):
    """
    Fetch board information from boards.txt on GitHub
    """
    print(f"Fetching board info for {board_id} from GitHub...")
    try:
        # Fetch boards.txt from GitHub
        response = requests.get(ESP32_BOARDS_TXT_URL, timeout=10)
        response.raise_for_status()
        
        # Parse boards.txt to find the board
        board_info = {}
        board_prefix = f"{board_id}."
        for line in response.text.splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            if '=' in line:
                key, value = line.split('=', 1)
                if key.startswith(board_prefix):
                    # Extract the property name after the board prefix
                    prop = key[len(board_prefix):]
                    board_info[prop] = value
        
        if board_info:
            # Extract flash size from build.flash_size if available
            flash_size = None
            if "build.flash_size" in board_info:
                flash_size_str = board_info["build.flash_size"]
                # Extract numeric part of flash size
                size_match = re.match(r'(\d+)[mM]', flash_size_str)
                if size_match:
                    flash_size = int(size_match.group(1))
            
            # Extract default partition scheme
            default_partition = None
            if "build.partitions" in board_info:
                default_partition = board_info["build.partitions"]
            
            return {
                "flash_size": flash_size,
                "default_partition": default_partition,
                "raw_info": board_info
            }
        else:
            print(f"Board {board_id} not found in boards.txt")
            return None
    except Exception as e:
        print(f"Error fetching board info from GitHub: {e}")
        return None

def fetch_partition_file_from_github(partition_name):
    """
    Fetch a partition file from the ESP32 Arduino core GitHub repository
    """
    print(f"Fetching partition file {partition_name} from GitHub...")
    try:
        # Ensure the partition name has a .csv extension
        if not partition_name.endswith('.csv'):
            partition_name += '.csv'
        
        # Fetch the partition file
        url = f"{ESP32_PARTITIONS_BASE_URL}{partition_name}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Save to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as temp_file:
            temp_file.write(response.content)
            return temp_file.name
    except Exception as e:
        print(f"Error fetching partition file from GitHub: {e}")
        return None

def find_matching_tinyuf2_partition(flash_size):
    """
    Find a TinyUF2 partition that matches the flash size
    """
    print(f"Looking for a TinyUF2 partition for {flash_size}MB flash...")
    try:
        # Use GitHub API to fetch the list of files in the partitions directory
        response = requests.get(ESP32_GITHUB_API_PARTITIONS_URL, timeout=10)
        response.raise_for_status()
        
        # Parse the JSON response to get the file list
        files_data = response.json()
        partition_files = []
        
        # Extract file names from the response
        for file_data in files_data:
            if file_data.get("type") == "file" and file_data.get("name", "").endswith(".csv"):
                partition_files.append(file_data.get("name"))
        
        print(f"Found {len(partition_files)} partition files")
        
        # Filter for TinyUF2 partitions
        tinyuf2_partitions = [p for p in partition_files if "tinyuf2" in p.lower()]
        print(f"Found {len(tinyuf2_partitions)} TinyUF2 partition files: {tinyuf2_partitions}")
        
        # Prioritize normal TinyUSB partitions over no-ota versions
        normal_partitions = [p for p in tinyuf2_partitions if "noota" not in p.lower()]
        if normal_partitions:
            tinyuf2_partitions = normal_partitions
            print(f"Filtered to {len(tinyuf2_partitions)} normal TinyUSB partitions: {tinyuf2_partitions}")
        else:
            print("No normal TinyUSB partitions found, falling back to no-ota versions")
        
        # Find a partition that matches the flash size
        if flash_size:
            size_str = f"{flash_size}mb"
            matching_partitions = [p for p in tinyuf2_partitions if size_str in p.lower()]
            if matching_partitions:
                print(f"Found matching TinyUF2 partition for {flash_size}MB flash: {matching_partitions[0]}")
                # Use the first matching partition
                return fetch_partition_file_from_github(matching_partitions[0])
            
            # If no exact match, try to find the closest match
            if flash_size > 8:
                # Look for 8MB partitions if we can't find 16MB
                fallback_size = 8
            elif flash_size > 4:
                # Look for 4MB partitions if we can't find 8MB
                fallback_size = 4
            else:
                # Default to 4MB
                fallback_size = 4
            
            fallback_size_str = f"{fallback_size}mb"
            fallback_partitions = [p for p in tinyuf2_partitions if fallback_size_str in p.lower()]
            if fallback_partitions:
                print(f"No exact match for {flash_size}MB, using fallback {fallback_size}MB partition: {fallback_partitions[0]}")
                return fetch_partition_file_from_github(fallback_partitions[0])
        
        # If no match by size, use the first available TinyUF2 partition
        if tinyuf2_partitions:
            print(f"No size-specific match found, using first available TinyUSB partition: {tinyuf2_partitions[0]}")
            return fetch_partition_file_from_github(tinyuf2_partitions[0])
        
        print("No TinyUSB partitions found")
        return None
    except Exception as e:
        print(f"Error finding matching TinyUSB partition: {e}")
        return None

def locate_uf2conv_script():
    """
    Locate the uf2conv.py script in common locations
    
    Returns:
        Path to the uf2conv.py script if found, None otherwise
    """
    # Check common Arduino ESP32 core locations
    common_locations = [
        # Arduino IDE default location
        Path(os.path.expanduser("~")) / "AppData" / "Local" / "Arduino15" / "packages" / "esp32" / "tools" / "uf2conv.py",
        # Manual installation locations
        Path("C:\") / "dev" / "arduino" / "arduino-esp32" / "tools" / "uf2conv.py",
        Path("C:\") / "Users" / os.getlogin() / "Arduino" / "hardware" / "esp32" / "esp32" / "tools" / "uf2conv.py",
        # Arduino CLI default location
        Path(os.path.expanduser("~")) / ".arduino15" / "packages" / "esp32" / "tools" / "uf2conv.py"
    ]
    
    # Check each location
    for location in common_locations:
        if location.exists():
            print(f"Found uf2conv.py at: {location}")
            return location
    
    # Check if it's in PATH
    for path in os.environ["PATH"].split(os.pathsep):
        script_path = Path(path) / "uf2conv.py"
        if script_path.exists():
            print(f"Found uf2conv.py in PATH at: {script_path}")
            return script_path
    
    print("Warning: Could not locate uf2conv.py. Please ensure the Arduino ESP32 core is installed.")
    return None

if __name__ == "__main__":
    main()

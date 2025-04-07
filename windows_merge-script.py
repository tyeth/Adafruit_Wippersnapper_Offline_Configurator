#!/usr/bin/env python3
import os
import sys
import subprocess
import tempfile
import shutil
import hashlib
import json
import glob
from pathlib import Path

# Constants
BASE_DIR = Path(r"C:\dev\arduino\Adafruit_Wippersnapper_Offline_Configurator")
OUTPUT_DIR = BASE_DIR / "merged_firmware"
FIRMWARE_DIR = BASE_DIR / "latest_firmware"
FAT_SIZE = 1024 * 1024  # 1MB FAT partition
OFFLINE_FILES = ["offline.js", "offline.html"]

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
        "partition_size": FAT_SIZE
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

def create_fat_image(output_path, files_to_include):
    """Create a FAT32 image containing the specified files"""
    # Create a temporary directory for mounting
    with tempfile.TemporaryDirectory() as mount_dir:
        # Create a raw disk image
        img_size_bytes = FAT_SIZE
        with open(output_path, 'wb') as f:
            f.write(b'\x00' * img_size_bytes)
        
        # Format as FAT32 using Windows diskpart
        diskpart_script = tempfile.NamedTemporaryFile(delete=False, suffix='.txt')
        try:
            # Get absolute paths
            abs_output_path = os.path.abspath(output_path)
            
            # Write diskpart script
            with open(diskpart_script.name, 'w') as f:
                f.write(f"create vdisk file=\"{abs_output_path}\" maximum={img_size_bytes // 1024 // 1024} type=fixed\n")
                f.write(f"select vdisk file=\"{abs_output_path}\"\n")
                f.write("attach vdisk\n")
                f.write("create partition primary\n")
                f.write("format fs=fat32 quick\n")
                f.write("assign letter=X\n")
                f.write("exit\n")
            
            # Run diskpart
            subprocess.run(["diskpart", "/s", diskpart_script.name], check=True)
            
            # Copy files to the mounted drive
            for file_path in files_to_include:
                src_path = BASE_DIR / file_path
                dest_path = Path("X:/") / os.path.basename(file_path)
                shutil.copy2(src_path, dest_path)
                print(f"Copied {src_path} to {dest_path}")
            
            # Detach the virtual disk
            detach_script = tempfile.NamedTemporaryFile(delete=False, suffix='.txt')
            with open(detach_script.name, 'w') as f:
                f.write(f"select vdisk file=\"{abs_output_path}\"\n")
                f.write("detach vdisk\n")
                f.write("exit\n")
                
            subprocess.run(["diskpart", "/s", detach_script.name], check=True)
            os.unlink(detach_script.name)
            
        finally:
            os.unlink(diskpart_script.name)
    
    return output_path

def calculate_checksum(file_path):
    """Calculate MD5 checksum of a file"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def convert_to_uf2(img_path, platform_type, output_path, base_addr):
    """Convert raw image to UF2 format"""
    # Check if required tools are available
    if platform_type == "RP2040":
        # Using RP2040 UF2 converter
        uf2conv_script = os.environ.get("UF2CONV_PATH", "uf2conv.py")  # You might need to set this env var
        cmd = [
            "python", uf2conv_script,
            "--base", hex(base_addr),
            "--family", PLATFORM_PARAMS[platform_type]["uf2_family_id"],
            "--output", output_path,
            img_path
        ]
    else:  # ESP32
        # Using TinyUF2 converter for ESP32
        tinyuf2_script = os.environ.get("TINYUF2_CONV_PATH", "tinyuf2/tools/uf2conv.py")  # You might need to set this
        cmd = [
            "python", tinyuf2_script,
            "--base", hex(base_addr),
            "--family", platform_type,
            "--output", output_path,
            img_path
        ]
    
    print(f"Running command: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)
    return output_path

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
    """Process a single firmware file, create merged version with filesystem"""
    fw_name = os.path.basename(fw_path)
    fw_checksum = calculate_checksum(fw_path)
    output_name = f"merged_{fw_checksum}_{fw_name}"
    output_path = OUTPUT_DIR / output_name
    
    # Determine platform type based on filename
    if any(x in fw_name.lower() for x in ["esp32", "esp32s2", "esp32s3"]):
        platform_type = "ESP32"
    elif any(x in fw_name.lower() for x in ["rp2040", "rp2350", "rp2"]):
        platform_type = "RP2040"
    else:
        print(f"Warning: Could not determine platform type for {fw_name}, assuming RP2040")
        platform_type = "RP2040"
    
    print(f"Processing {fw_name} as {platform_type} firmware...")
    
    # Create temporary files
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create FAT image
        fat_img_path = os.path.join(temp_dir, "fat32.img")
        create_fat_image(fat_img_path, OFFLINE_FILES)
        
        # Convert FAT image to UF2
        fs_uf2_path = os.path.join(temp_dir, "filesystem.uf2")
        base_addr = PLATFORM_PARAMS[platform_type]["fat_base_addr"]
        convert_to_uf2(fat_img_path, platform_type, fs_uf2_path, base_addr)
        
        # Merge firmware UF2 with filesystem UF2
        merge_uf2_files(fw_path, fs_uf2_path, output_path)
    
    print(f"Created merged firmware: {output_path}")
    return output_path

def fetch_ci_arduino_parameters():
    """
    Attempt to fetch board-specific parameters from the ci-arduino repository
    This requires the repo to be locally cloned or accessible
    """
    try:
        ci_arduino_path = os.environ.get("CI_ARDUINO_PATH", "../ci-arduino")
        platforms_file = Path(ci_arduino_path) / "all_platforms.py"
        
        if not platforms_file.exists():
            print(f"Warning: Could not find ci-arduino platforms file at {platforms_file}")
            return {}
        
        # Simple parsing of the platforms file to extract partition information
        # This is a basic approach - a more robust solution would use ast module
        # to properly parse the Python file
        board_params = {}
        with open(platforms_file, 'r') as f:
            content = f.read()
            
        # Look for board definitions with partition information
        import re
        board_defs = re.findall(r'(\w+)\s*=\s*{(.*?)}', content, re.DOTALL)
        
        for board_name, board_def in board_defs:
            # Look for partition information
            partition_match = re.search(r'["\'](build\.partitions)["\']:\s*["\'](.*?)["\']', board_def)
            if partition_match:
                partition_name = partition_match.group(2)
                # Add to our board parameters
                board_params[board_name.lower()] = {
                    "partition_name": partition_name
                }
                print(f"Found partition info for {board_name}: {partition_name}")
        
        return board_params
    except Exception as e:
        print(f"Error fetching ci-arduino parameters: {e}")
        return {}

def main():
    os.chdir(BASE_DIR)
    print(f"Working directory: {os.getcwd()}")
    
    # Try to fetch board-specific parameters from ci-arduino repo
    ci_params = fetch_ci_arduino_parameters()
    if ci_params:
        print(f"Found {len(ci_params)} board configurations from ci-arduino")
        # Update our board parameters with the fetched information
        for board_id, params in ci_params.items():
            if board_id in BOARD_SPECIFIC_PARAMS:
                BOARD_SPECIFIC_PARAMS[board_id].update(params)
            else:
                # Determine platform type from board ID
                platform = "ESP32" if "esp" in board_id else "RP2040"
                BOARD_SPECIFIC_PARAMS[board_id] = {
                    "platform": platform,
                    "fat_base_addr": PLATFORM_PARAMS[platform]["fat_base_addr"],
                    **params
                }
    
    # Find all UF2 firmware files
    fw_files = list(FIRMWARE_DIR.glob("*.uf2"))
    if not fw_files:
        print(f"No UF2 firmware files found in {FIRMWARE_DIR}")
        return
    
    print(f"Found {len(fw_files)} firmware files")
    
    # Process each firmware file
    for fw_file in fw_files:
        try:
            process_firmware_file(fw_file)
        except Exception as e:
            print(f"Error processing {fw_file}: {e}")
    
    print("Processing complete!")

if __name__ == "__main__":
    main()

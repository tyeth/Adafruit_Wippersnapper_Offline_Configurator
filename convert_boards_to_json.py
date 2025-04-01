import os
import json
import glob
from pathlib import Path

# Base directory for the boards
BOARDS_DIR = r"C:\dev\arduino\Adafruit_Wippersnapper_Boards\Wippersnapper_Boards\boards"
OUTPUT_FILE = r"C:\dev\arduino\Adafruit_Wippersnapper_Offline_Configurator\wippersnapper_boards.json"

def convert_boards_to_json():
    """
    Convert all board definition.json files into a single JSON file
    that can be used in the Wippersnapper Configuration Builder.
    """
    boards = {}
    
    # Get all board directories
    board_dirs = [d for d in os.listdir(BOARDS_DIR) if os.path.isdir(os.path.join(BOARDS_DIR, d)) and not d.startswith('.')]
    
    for board_dir in board_dirs:
        board_path = os.path.join(BOARDS_DIR, board_dir)
        definition_file = os.path.join(board_path, "definition.json")
        
        # Skip if the definition.json doesn't exist
        if not os.path.exists(definition_file):
            print(f"Skipping {board_dir} - No definition.json found")
            continue
        
        try:
            # Read the definition.json file
            with open(definition_file, 'r') as f:
                board_data = json.load(f)
            
            # Extract relevant information
            board_info = {
                "boardName": board_data.get("boardName"),
                "mcuName": board_data.get("mcuName"),
                "referenceVoltage": board_data.get("mcuRefVoltage", 3.3),
                "displayName": board_data.get("displayName"),
                "vendor": board_data.get("vendor"),
                "productURL": board_data.get("productURL", ""),
                "documentationURL": board_data.get("documentationURL", ""),
                "pins": [],
                "analogPins": [],
                "defaultI2C": {},
                "image": None
            }
            
            # Get pins
            if "components" in board_data and "digitalPins" in board_data["components"]:
                for pin in board_data["components"]["digitalPins"]:
                    # Extract the numeric part of the pin name (e.g., "D13" -> 13)
                    pin_name = pin.get("name", "")
                    if pin_name.startswith("D"):
                        try:
                            pin_number = int(pin_name[1:])
                            board_info["pins"].append({
                                "number": pin_number,
                                "name": pin_name,
                                "displayName": pin.get("displayName", pin_name),
                                "hasPWM": pin.get("hasPWM", False),
                                "hasServo": pin.get("hasServo", False)
                            })
                        except ValueError:
                            print(f"Skipping pin {pin_name} - Cannot parse pin number")
            
            # Get analog pins
            if "components" in board_data and "analogPins" in board_data["components"]:
                analog_count = 0
                for pin in board_data["components"]["analogPins"]:
                    pin_name = pin.get("name", "")
                    board_info["analogPins"].append({
                        "name": pin_name,
                        "displayName": pin.get("displayName", pin_name),
                        "direction": pin.get("direction", "INPUT")
                    })
                    analog_count += 1
                board_info["totalAnalogPins"] = analog_count
            
            # Get I2C ports
            if "components" in board_data and "i2cPorts" in board_data["components"]:
                i2c_ports = board_data["components"]["i2cPorts"]
                if i2c_ports and len(i2c_ports) > 0:
                    default_i2c = i2c_ports[0]  # Use the first I2C port as default
                    board_info["defaultI2C"] = {
                        "i2cPortId": default_i2c.get("i2cPortId", 0),
                        "SCL": default_i2c.get("SCL"),
                        "SDA": default_i2c.get("SDA")
                    }
                    
                    # Store all I2C ports
                    board_info["i2cPorts"] = i2c_ports
            
            # Count total GPIO pins
            board_info["totalGPIOPins"] = len(board_info["pins"])
            
            # Look for an image file
            image_extensions = ['.jpg', '.jpeg', '.png', '.gif']
            for ext in image_extensions:
                image_file = os.path.join(board_path, f"image{ext}")
                if os.path.exists(image_file):
                    # Store relative path to image
                    board_info["image"] = f"boards/{board_dir}/image{ext}"
                    break
            
            # Add to boards dictionary
            boards[board_dir] = board_info
            print(f"Processed {board_dir}")
            
        except Exception as e:
            print(f"Error processing {board_dir}: {str(e)}")
    
    # Write the consolidated JSON file
    with open(OUTPUT_FILE, 'w') as f:
        json.dump({"boards": boards}, f, indent=2)
    
    print(f"Successfully created {OUTPUT_FILE} with {len(boards)} boards")
    return boards

# Execute the function
if __name__ == "__main__":
    boards = convert_boards_to_json()
    print(f"Converted {len(boards)} board definitions")

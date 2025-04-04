import os
import json
import glob
import re
import requests
from bs4 import BeautifulSoup
from pathlib import Path

# Base directory for the components
COMPONENTS_DIR = r"./Wippersnapper_Components/components"
OUTPUT_FILE = r"./wippersnapper_components.json"

def get_image_from_adafruit_product_url(product_url):
    """
    Fetch the product image URL from an Adafruit product page by extracting
    the og:image meta tag from the HTML.
    
    Args:
        product_url (str): URL to an Adafruit product page
        
    Returns:
        str or None: URL to the product image, or None if not found
    """
    if not product_url or not re.match(r'https?://(?:www\.)?adafruit\.com/product/\d+', product_url):
        return None
    
    try:
        response = requests.get(product_url, timeout=10)
        if response.status_code != 200:
            print(f"Failed to fetch product page: {product_url}, status code: {response.status_code}")
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        og_image = soup.find('meta', property='og:image')
        
        if og_image and 'content' in og_image.attrs:
            image_url = og_image['content']
            print(f"Found image URL from product page: {image_url}")
            return image_url
        else:
            print(f"No og:image meta tag found for: {product_url}")
            return None
    except Exception as e:
        print(f"Error fetching image from product URL {product_url}: {str(e)}")
        return None

def map_datatypes_to_offline_types(datatype):
    """
    Map datatypes to offline types.

    humidity should be relative-humidity
    """
    datatype = datatype.lower().replace("humidity", "relative-humidity")
    return datatype

def convert_components_to_json():
    """
    Convert all component definition.json files into a single JSON file
    that can be used in the Wippersnapper Configuration Builder.
    """
    components = {}
    
    # Get all component category directories
    category_dirs = [d for d in os.listdir(COMPONENTS_DIR) if os.path.isdir(os.path.join(COMPONENTS_DIR, d)) and not d.startswith('.')]
    
    for category in category_dirs:
        category_path = os.path.join(COMPONENTS_DIR, category)
        category_components = []
        
        # Get component directories within this category
        component_dirs = [d for d in os.listdir(category_path) if os.path.isdir(os.path.join(category_path, d)) and not d.startswith('.')]
        
        for component_dir in component_dirs:
            component_path = os.path.join(category_path, component_dir)
            definition_file = os.path.join(component_path, "definition.json")
            
            # Skip if the definition.json doesn't exist
            if not os.path.exists(definition_file):
                print(f"Skipping {category}/{component_dir} - No definition.json found")
                continue
            
            try:
                # Read the definition.json file
                with open(definition_file, 'r') as f:
                    component_data = json.load(f)
                
                # Extract relevant information
                component_info = {
                    "id": component_dir,
                    "name": component_data.get("name", component_dir),
                    "description": component_data.get("description", ""),
                    "category": category,
                    "dataTypes": [],
                    "image": None
                }
                
                # Store product URL if available
                if "productURL" in component_data:
                    component_info["productUrl"] = component_data["productURL"]
                
                # Extract data types if available
                if "subcomponents" in component_data:
                    for meas_type in component_data["subcomponents"]:
                        if isinstance(meas_type, dict) and "sensorType" in meas_type:
                            component_info["dataTypes"].append({
                                "displayName": meas_type["displayName"] if "displayName" in meas_type else meas_type["sensorType"],
                                "sensorType": map_datatypes_to_offline_types(meas_type["sensorType"]) if "sensorType" in meas_type else None
                            })
                        else:
                            component_info["dataTypes"].append(map_datatypes_to_offline_types(meas_type))
                
                # Handle I2C-specific properties
                if category == "i2c":
                    # Extract I2C address from parameters
                    if "i2cAddresses" in component_data:
                        default_address = component_data["i2cAddresses"][0]
                        component_info["address"] = default_address
                        
                        # Get all possible addresses
                        component_info["addresses"] = component_data["i2cAddresses"]
                    else:
                        raise ValueError(f"No i2cAddresses found for {category}/{component_dir}")
                
                    # Special handling for multiplexers
                    if "multiplexer" in component_dir.lower() or "mux" in component_dir.lower():
                        if "pca9548" in component_dir.lower() or "tca9548" in component_dir.lower():
                            component_info["channels"] = 8
                        else:
                            component_info["channels"] = 4
                
                # Look for an image file
                image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg']
                image_found = False
                for ext in image_extensions:
                    image_file = os.path.join(component_path, f"image{ext}")
                    if os.path.exists(image_file):
                        # Store relative path to image
                        component_info["image"] = f"components/{category}/{component_dir}/image{ext}"
                        image_found = True
                        break
                
                # If no local image found and we have a product URL from Adafruit, try to fetch the image
                if not image_found and "productUrl" in component_info:
                    product_url = component_info["productUrl"]
                    image_url = get_image_from_adafruit_product_url(product_url)
                    if image_url:
                        component_info["image"] = image_url
                        print(f"Using Adafruit product image for {category}/{component_dir}: {image_url}")
                
                # Add to category components
                category_components.append(component_info)
                print(f"Processed {category}/{component_dir}")
                
            except Exception as e:
                print(f"Error processing {category}/{component_dir}: {str(e)}")
        
        # Add this category to components dictionary
        components[category] = category_components
    
    # Check for schema.json files in each category for any additional metadata
    for category in category_dirs:
        schema_file = os.path.join(COMPONENTS_DIR, category, "schema.json")
        if os.path.exists(schema_file):
            try:
                with open(schema_file, 'r') as f:
                    schema_data = json.load(f)
                
                # Add metadata about the category if not already in components
                if f"{category}_metadata" not in components:
                    components[f"{category}_metadata"] = {
                        "title": schema_data.get("title", category),
                        "description": schema_data.get("description", ""),
                        "required": schema_data.get("required", []),
                        "properties": schema_data.get("properties", {})
                    }
            except Exception as e:
                print(f"Error processing schema for {category}: {str(e)}")
    
    # Write the consolidated JSON file
    with open(OUTPUT_FILE, 'w') as f:
        json.dump({"components": components}, f, indent=2)
    
    # Write the consolidated JS file
    with open(OUTPUT_FILE.replace('.json', '.js'), 'w') as f:
        f.write("window.jsonComponentsObject = ")
        json.dump({"components": components}, f, indent=2)
        f.write(";\n")

    print(f"Successfully created {OUTPUT_FILE}")
    
    # Calculate component count
    total_components = sum(len(components[cat]) for cat in components if not cat.endswith('_metadata'))
    print(f"Processed {total_components} components across {len(category_dirs)} categories")
    
    return components

# Execute the function
if __name__ == "__main__":
    components = convert_components_to_json()
    
    # Print summary
    for category, items in components.items():
        if not category.endswith('_metadata'):
            print(f"Category: {category} - {len(items)} components")

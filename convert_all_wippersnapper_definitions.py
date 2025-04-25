import os
import time
from convert_boards_to_json import convert_boards_to_json
from convert_components_to_json import convert_components_to_json
from fetch_latest_release_info_and_assets import main as fetch_latest_release_info_and_assets

def main():
    """
    Run both conversion scripts and report the results
    """
    print("=== Wippersnapper Definitions Converter ===")
    print("Converting all Wippersnapper definitions to JSON...")
    
    start_time = time.time()
    
    # Convert boards
    print("\n--- Converting Boards ---")
    boards = convert_boards_to_json()
    
    # Convert components
    print("\n--- Converting Components ---")
    components = convert_components_to_json()

    # fetch latest release info and assets
    release_info = fetch_latest_release_info_and_assets()
    
    # Print summary
    elapsed_time = time.time() - start_time
    print("\n=== Conversion Complete ===")
    print(f"Converted {len(boards)} boards and {sum(len(components[cat]) for cat in components if not cat.endswith('_metadata'))} components")
    print(f"Time taken: {elapsed_time:.2f} seconds")
    print(f"Output files:")
    print(f"  - {os.path.abspath(r'wippersnapper_boards.json')}")
    print(f"  - {os.path.abspath(r'wippersnapper_components.json')}")

if __name__ == "__main__":
    main()

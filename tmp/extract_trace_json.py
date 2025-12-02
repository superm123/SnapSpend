import zipfile
import sys
import os

zip_path = r'C:\Users\marti\OneDrive\Documents\GitHub\budget_planner\test-results\e2e-scan-flow-E2E-Receipt--13f1b-enses-and-verify-in-summary-chromium\trace.zip'
extract_file_name = 'resources/97d170e1550eee4afc0af065b78cda302a97674c.json'
output_dir = os.path.join(os.path.dirname(__file__)) # Extract to the same directory as the script

try:
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        if extract_file_name in zip_ref.namelist():
            zip_ref.extract(extract_file_name, output_dir)
            print(f"Successfully extracted {extract_file_name} to {os.path.join(output_dir, extract_file_name)}")
        else:
            print(f"Error: {extract_file_name} not found in {zip_path}", file=sys.stderr)
except FileNotFoundError:
    print(f"Error: Zip file not found at {zip_path}", file=sys.stderr)
except zipfile.BadZipFile:
    print(f"Error: {zip_path} is not a valid zip file", file=sys.stderr)

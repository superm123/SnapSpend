import zipfile
import sys
import os

zip_path = r'C:\Users\marti\OneDrive\Documents\GitHub\budget_planner\test-results\e2e-scan-flow-E2E-Receipt--13f1b-enses-and-verify-in-summary-chromium\trace.zip'
output_file_path = os.path.join(os.path.dirname(__file__), 'zip_contents.txt')

try:
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        with open(output_file_path, 'w') as outfile:
            for name in zip_ref.namelist():
                outfile.write(name + '\n')
except FileNotFoundError:
    with open(output_file_path, 'w') as outfile:
        outfile.write(f"Error: Zip file not found at {zip_path}\n")
except zipfile.BadZipFile:
    with open(output_file_path, 'w') as outfile:
        outfile.write(f"Error: {zip_path} is not a valid zip file\n")

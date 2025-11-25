import cv2
import pytesseract
from PIL import Image
import sys
import os

def process_image_for_ocr(image_path):
    """
    Performs OCR on an image file using Tesseract.
    Includes basic image pre-processing for better OCR results.
    """
    if not os.path.exists(image_path):
        return f"Error: Image file not found at {image_path}"

    try:
        # Load the image using OpenCV
        img = cv2.imread(image_path)

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Apply thresholding to get a binary image (optimal for Tesseract)
        # Adjusting the threshold values might be necessary for different image types
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

        # If Tesseract is not in your PATH, you might need to specify the path to its executable
        # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe' # Example for Windows

        # Perform OCR
        text = pytesseract.image_to_string(thresh, lang='eng')

        return text
    except Exception as e:
        return f"Error during OCR processing: {e}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ocr_processor.py <image_path>")
        sys.exit(1)

    image_file_path = sys.argv[1]
    extracted_text = process_image_for_ocr(image_file_path)
    print(extracted_text)

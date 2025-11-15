"""
Example usage of the Emirates ID OCR API
This demonstrates how to use the API endpoints
"""

import requests
import base64
import json

# API base URL
API_BASE_URL = "http://localhost:5000"


def encode_image_to_base64(image_path: str) -> str:
    """Encode image file to base64 string"""
    with open(image_path, 'rb') as image_file:
        encoded = base64.b64encode(image_file.read()).decode('utf-8')
        return f"data:image/jpeg;base64,{encoded}"


def test_health_check():
    """Test health check endpoint"""
    print("Testing health check...")
    response = requests.get(f"{API_BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()


def test_ocr_process(image_path: str, side: str = "front"):
    """Test OCR processing endpoint"""
    print(f"Testing OCR process for {side} side...")
    
    # Encode image
    image_base64 = encode_image_to_base64(image_path)
    
    # Prepare request
    payload = {
        "image": image_base64,
        "side": side
    }
    
    # Send request
    response = requests.post(
        f"{API_BASE_URL}/api/ocr/process",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Success: {result.get('success')}")
    
    if result.get('success'):
        print(f"Extracted Data:")
        print(json.dumps(result.get('data', {}), indent=2))
        print(f"Confidence: {result.get('confidence', 0):.2f}")
    else:
        print(f"Error: {result.get('error')}")
    
    print()
    return result


def test_validate_id(image_path: str, side: str = "front"):
    """Test ID validation endpoint"""
    print(f"Testing ID validation for {side} side...")
    
    # Encode image
    image_base64 = encode_image_to_base64(image_path)
    
    # Prepare request
    payload = {
        "image": image_base64,
        "side": side
    }
    
    # Send request
    response = requests.post(
        f"{API_BASE_URL}/api/ocr/validate",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Success: {result.get('success')}")
    print(f"Is Valid: {result.get('isValid')}")
    print(f"Is Emirates ID: {result.get('isEmiratesID')}")
    print(f"Confidence: {result.get('confidence', 0):.2f}")
    
    if result.get('errors'):
        print(f"Errors: {result.get('errors')}")
    if result.get('warnings'):
        print(f"Warnings: {result.get('warnings')}")
    
    print()
    return result


def test_batch_process(image_paths: list):
    """Test batch processing endpoint"""
    print("Testing batch processing...")
    
    images = []
    for idx, (path, side) in enumerate(image_paths):
        image_base64 = encode_image_to_base64(path)
        images.append({
            "image": image_base64,
            "side": side
        })
    
    payload = {"images": images}
    
    response = requests.post(
        f"{API_BASE_URL}/api/ocr/batch",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Success: {result.get('success')}")
    print(f"Processed: {result.get('processed')} images")
    print(f"Results:")
    print(json.dumps(result.get('results', []), indent=2))
    print()


if __name__ == "__main__":
    # Make sure the API server is running first!
    # python app.py
    
    # Test health check
    try:
        test_health_check()
        
        # Example: Test with actual image files
        # Uncomment and provide actual image paths
        # test_ocr_process("path/to/emirates_id_front.jpg", "front")
        # test_validate_id("path/to/emirates_id_front.jpg", "front")
        # test_batch_process([
        #     ("path/to/emirates_id_front.jpg", "front"),
        #     ("path/to/emirates_id_back.jpg", "back")
        # ])
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to API server.")
        print("Make sure the server is running: python app.py")
    except Exception as e:
        print(f"Error: {str(e)}")


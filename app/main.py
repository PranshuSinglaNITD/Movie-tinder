import os
import base64
from io import BytesIO
from PIL import Image
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import chromadb
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key=os.getenv('GEMINI_API_KEY')
app = FastAPI()

print("Loading CLIP model...")
embedding_model = SentenceTransformer('clip-ViT-B-32')

print("Initializing Vector Database...")
db_client = chromadb.Client()
collection = db_client.get_or_create_collection(name="vibe_database")

gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", api_key))

print("Loading OpenCV Haar Cascade for face detection...")
# Initialize OpenCV's built-in face detector (no dlib required) 
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
cap=cv2.VideoCapture(0)
# Define the expected incoming data format
class VisionRequest(BaseModel):
    imageBase64: str
    prompt: str

@app.post("/process-vision")
async def process_room_data(request: VisionRequest):
    try:
        # 1. Decode the base64 image coming from Next.js
        base64_data = request.imageBase64
        if "," in base64_data:
            base64_data = base64_data.split(",")[1]
            
        image_bytes = base64.b64decode(base64_data)
        pil_img = Image.open(BytesIO(image_bytes))
        
        # 2. OPENCV NATIVE FACE COUNTING
        # Convert PIL Image to an OpenCV numpy array
        cv_img = np.array(pil_img)
        # Convert RGB to BGR (OpenCV format), then to Grayscale
        cv_img_bgr = cv2.cvtColor(cv_img, cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_img_bgr, cv2.COLOR_BGR2GRAY)
        
        # Detect faces using Haar Cascade
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(30, 30)
        )
        actual_headcount = len(faces)
        cap.release()
        print(f"Verified headcount: {actual_headcount}")

        # 3. CHROMA DB RAG PIPELINE
        query_embedding = embedding_model.encode(pil_img).tolist()
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=1
        )
        
        db_context = "No specific database matches found."
        if results and results['documents'] and len(results['documents'][0]) > 0:
            db_context = results['documents'][0][0]
            
        # 4. THE MASTER AI ENGINE
        system_prompt = f"""
        You are the core logic engine for a movie recommendation app.
        
        Inputs provided:
        1. User's specific text prompt: "{request.prompt}"
        2. Verified Headcount: {actual_headcount} people in the room.
        3. Visually similar vibe from our database: "{db_context}"
        
        Analyze the provided image alongside these inputs.
        Return ONLY a raw JSON object with no markdown formatting containing:
        1. "headcount": {actual_headcount} (use this exact number)
        2. "vibe": A 2-3 line description of the room's atmosphere.
        3. "recommendations": An array of 5 movie titles that bridge the user's prompt, the headcount, and the visual vibe.
        """
        
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[system_prompt, pil_img]
        )
        
        clean_json = response.text.replace('```json', '').replace('```', '').strip()
        return {"success": True, "result": clean_json}

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
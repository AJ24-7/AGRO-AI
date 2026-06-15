"""Rule-based farming assistant chatbot."""
from fastapi import APIRouter, Depends
from .. import schemas
from ..deps import get_current_user

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])

# Simple keyword -> answer knowledge base
KB = [
    (["crop", "grow", "plant"],
     "Upload a soil report on the Soil Analysis page, then visit Crop "
     "Recommendation. Our AI suggests the best crop from your N-P-K & pH values."),
    (["fertilizer", "urea", "dap", "nutrient"],
     "Use the Fertilizer page. Based on your soil values and chosen crop we "
     "recommend Urea, DAP or Organic fertilizer with quantities."),
    (["disease", "leaf", "infection", "treat"],
     "Go to Disease Detection and upload a clear leaf photo. We identify the "
     "disease, confidence and suggested treatment."),
    (["wheat"], "Wheat grows best in well-drained loamy soil with pH 6-7.5. "
                "Apply nitrogen in split doses."),
    (["rice"], "Rice prefers clay soil that retains water, pH 5.5-6.5, "
               "with adequate nitrogen and standing water."),
    (["hello", "hi", "hey"], "Hello! 👋 I'm AgroPilot Assistant. Ask me about "
                             "crops, fertilizers or plant diseases."),
]
DEFAULT = ("I'm not sure about that. Try asking about crops, fertilizers, "
           "or crop diseases. 🌱")


@router.post("/ask")
def ask(payload: schemas.ChatInput, user=Depends(get_current_user)):
    text = payload.message.lower()
    for keywords, answer in KB:
        if any(k in text for k in keywords):
            return {"reply": answer}
    return {"reply": DEFAULT}

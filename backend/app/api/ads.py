"""
Ads API — lets brands submit ad briefs via POST and get them voiced + queued on air.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import threading
import logging

from app.services.ad_agent import generate_ad_sync, get_next_ad, _ad_queue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ads", tags=["ads"])


class AdBrief(BaseModel):
    brand: str
    product: str
    tagline: str = ""
    tone: str = "energetic and upbeat"
    duration_seconds: int = 30


@router.post("/submit")
async def submit_ad(brief: AdBrief):
    """
    Submit a new ad brief. The ad will be generated and queued for the next ad break.
    This is the monetisation endpoint — brands call this to get their ad on air.
    """
    ad_dict = brief.model_dump()
    ad_dict["ad_id"] = f"{brief.brand.lower().replace(' ', '_')}_{int(__import__('time').time())}"

    # Generate the ad in a background thread so we don't block the request
    def _generate():
        try:
            path = generate_ad_sync(ad_dict)
            if path:
                logger.info(f"[Ads API] Ad for '{brief.brand}' generated and queued: {path}")
        except Exception as e:
            logger.error(f"[Ads API] Ad generation failed for {brief.brand}: {e}")

    t = threading.Thread(target=_generate, daemon=True)
    t.start()

    return {
        "status": "queued",
        "message": f"Ad for '{brief.brand}' is being produced. It will air at the next ad break.",
        "ad_id": ad_dict["ad_id"]
    }


@router.get("/queue")
async def get_ad_queue():
    """Returns the current ad queue status."""
    return {
        "ads_in_queue": len(_ad_queue),
        "queue": [{"ad_id": a["ad_id"], "brand": a["brand"]} for a in _ad_queue]
    }


@router.get("/next")
async def peek_next_ad():
    """Preview what ad is next without removing it from the queue."""
    if _ad_queue:
        return _ad_queue[0]
    return {"message": "No ads in queue."}

import json
import logging
from typing import Any, Dict, List

import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-pro")
        else:
            self.model = None
            logger.warning(
                "GOOGLE_API_KEY not found. GeminiService operating in mock mode."
            )

    async def get_crowd_insights(self, venue_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Generate strategic insights from venue crowd data."""
        if not self.model or not self.api_key:
            return self._get_mock_insights(venue_summary)

        prompt = f"""
        Analyze the following real-time crowd data for a sports venue and provide strategic staff-allocation recommendations.
        Data: {json.dumps(venue_summary)}

        Provide the response in JSON format with the following keys:
        - "strategic_summary": A high-level overview of the venue status.
        - "critical_recommendations": List of urgent actions for 'critical' or 'high' congestion zones.
        - "efficiency_score": A score from 0-100 indicating how well staff are currently distributed.
        - "staff_maneuver": A specific suggestion for moving staff from low-density to high-density zones.
        """

        try:
            response = await self.model.generate_content_async(prompt)
            # Find JSON in response text (Gemini sometimes adds markdown blocks)
            text = response.text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end != -1:
                return json.loads(text[start:end])
            return self._get_mock_insights(venue_summary)
        except Exception as e:
            logger.error(f"Gemini AI generation failed: {e}")
            return self._get_mock_insights(venue_summary)

    def _get_mock_insights(self, venue_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback mock insights for demo purposes."""
        zones = venue_summary.get("zones", [])
        critical_zones = [
            z["zone_name"]
            for z in zones
            if z["congestion_level"] in ["critical", "high"]
        ]

        return {
            "strategic_summary": f"Neural matrix suggests {len(critical_zones)} focal points of interest.",
            "critical_recommendations": [
                f"Reinforce {z} perimeter immediately." for z in critical_zones
            ]
            if critical_zones
            else ["All sectors nominal. Maintain standard patrol routes."],
            "efficiency_score": 88 if not critical_zones else 62,
            "staff_maneuver": f"Redeploy backup units to {critical_zones[0] if critical_zones else 'Main Concourse'}.",
        }


gemini_service = GeminiService()

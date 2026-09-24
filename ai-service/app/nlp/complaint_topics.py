"""
NLP Topic extraction and theme clustering for student complaints.
Foundational interface for keyword matching and semantic embeddings.
"""
from typing import List, Dict, Any
import re

class ComplaintTopicClassifier:
    """
    Classifies student complaint free-text into primary semantic themes:
    - OIL_GREASINESS
    - MENU_REPETITION
    - MEAL_TIMELINESS
    - HYGIENE_CLEANLINESS
    - TASTE_SEASONING
    - GENERAL
    """

    THEME_KEYWORDS = {
        "OIL_GREASINESS": [r"\boil\b", r"\boily\b", r"\bgreasy\b", r"\bgrease\b", r"\bfloating oil\b"],
        "MENU_REPETITION": [r"\brepetitive\b", r"\boften\b", r"\bagain\b", r"\bvariety\b", r"\bsame food\b"],
        "MEAL_TIMELINESS": [r"\blate\b", r"\bdelay\b", r"\bdelayed\b", r"\bwaiting\b", r"\bcounter closed\b"],
        "HYGIENE_CLEANLINESS": [r"\bdirty\b", r"\bhygiene\b", r"\bwater\b", r"\bclean\b", r"\bwash\b", r"\binsect\b"],
        "TASTE_SEASONING": [r"\bsalt\b", r"\btaste\b", r"\bspicy\b", r"\braw\b", r"\bundercooked\b"]
    }

    def classify_text(self, text: str) -> Dict[str, Any]:
        """
        Classifies single complaint description into matched themes with heuristic scores.
        """
        if not text:
            return {"primary_theme": "GENERAL", "matched_themes": []}

        matched = []
        for theme, patterns in self.THEME_KEYWORDS.items():
            for p in patterns:
                if re.search(p, text, re.IGNORECASE):
                    matched.append(theme)
                    break

        primary = matched[0] if matched else "GENERAL"
        return {
            "primary_theme": primary,
            "matched_themes": matched,
            "has_oil_signal": "OIL_GREASINESS" in matched,
            "has_repetition_signal": "MENU_REPETITION" in matched
        }

    def batch_classify(self, texts: List[str]) -> List[Dict[str, Any]]:
        return [self.classify_text(t) for t in texts]

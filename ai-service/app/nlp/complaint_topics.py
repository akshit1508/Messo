"""
Semantic NLP Topic Classification and Theme Grouping for student complaints.
Uses text normalization, TF-IDF vector representations, and cosine similarity
against canonical semantic theme prototypes, supplemented with lexical matching.
"""

from typing import List, Dict, Any, Tuple
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd

THEME_PROTOTYPES = {
    "OIL_GREASINESS": (
        "oily greasy excessive oil floating oil heavy greasy gravy layer of oil "
        "curry too oily deep fried grease hard to digest oily dal"
    ),
    "MENU_REPETITION": (
        "repetitive menu again today too often lack of variety same food being repeated "
        "continuous repetition alternate day tired of eating same curry"
    ),
    "MEAL_TIMELINESS": (
        "late delay delayed counter opened late queue long waiting time slow service "
        "dinner delayed rotis finished night staff late"
    ),
    "HYGIENE_CLEANLINESS": (
        "dirty unhygiene insect hair in food water glasses unwashed dirty dining table "
        "plates not cleaned washing area hygiene"
    ),
    "FACILITY_WATER": (
        "water supply disrupted tap water leakage pipe repair drainage blocked "
        "washbasin empty drinking water dispenser plumbing"
    ),
    "TEMPERATURE_FRESHNESS": (
        "cold food stone cold hard rotis dry stale food served cold rotis dry "
        "not hot lukewarm"
    ),
    "TASTE_SEASONING": (
        "undercooked raw lacking salt bland too spicy sour burnt bad taste "
        "unflavored vegetables"
    ),
    "STAFF_BEHAVIOR": (
        "rude staff behavior shouting counter argument misbehavior refused curd "
        "unhelpful workers"
    )
}

# Supplementary regex indicators for high-precision boundary confirmation
SUPPLEMENTARY_PATTERNS = {
    "OIL_GREASINESS": [r"\boil\b", r"\boily\b", r"\bgreasy\b", r"\bgrease\b"],
    "MENU_REPETITION": [r"\brepetitive\b", r"\brepeat", r"\boften\b", r"\bagain\b", r"\bvariety\b"],
    "MEAL_TIMELINESS": [r"\blate\b", r"\bdelay", r"\bwaiting\b", r"\bqueue\b"],
    "HYGIENE_CLEANLINESS": [r"\bdirty\b", r"\bhygiene\b", r"\bunwashed\b", r"\binsect\b"],
    "FACILITY_WATER": [r"\bwater\b", r"\bpipe\b", r"\bplumb", r"\bdrainage\b", r"\bleak\b"],
    "TEMPERATURE_FRESHNESS": [r"\bcold\b", r"\bhard roti", r"\bstale\b"],
    "TASTE_SEASONING": [r"\bsalt\b", r"\bspicy\b", r"\braw\b", r"\bundercooked\b"],
    "STAFF_BEHAVIOR": [r"\brude\b", r"\bbehavior\b", r"\bshout\b"]
}

class ComplaintTopicClassifier:
    """
    Semantic Topic Classifier mapping unstructured complaint text into structured theme distributions.
    """

    def __init__(self):
        self.themes = list(THEME_PROTOTYPES.keys())
        self.prototype_texts = [THEME_PROTOTYPES[t] for t in self.themes]
        
        # Fit TF-IDF on prototype corpus
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            stop_words='english'
        )
        self.prototype_matrix = self.vectorizer.fit_transform(self.prototype_texts)

    def normalize(self, text: str) -> str:
        if not text:
            return ""
        # Lowercase and clean non-alphanumeric
        cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
        return " ".join(cleaned.split())

    def classify_text(self, text: str) -> Dict[str, Any]:
        """
        Classifies single complaint description into matched themes with similarity scores.
        """
        cleaned = self.normalize(text)
        if not cleaned:
            return {"primary_theme": "GENERAL", "similarity_score": 0.0, "matched_themes": []}

        # Vectorize input text
        text_vec = self.vectorizer.transform([cleaned])
        similarities = cosine_similarity(text_vec, self.prototype_matrix)[0]

        best_idx = int(np.argmax(similarities))
        best_score = float(similarities[best_idx])
        best_theme = self.themes[best_idx]

        # Check supplementary regex for precision
        lexical_matches = []
        for theme, patterns in SUPPLEMENTARY_PATTERNS.items():
            for p in patterns:
                if re.search(p, cleaned):
                    lexical_matches.append(theme)
                    break

        # Decision threshold: cosine similarity >= 0.12 or lexical match
        if best_score >= 0.12:
            primary = best_theme
        elif lexical_matches:
            primary = lexical_matches[0]
            best_score = 0.50
        else:
            primary = "GENERAL"
            best_score = 0.0

        all_matched = list(set([primary] + lexical_matches)) if primary != "GENERAL" else ["GENERAL"]

        return {
            "primary_theme": primary,
            "similarity_score": round(best_score, 3),
            "matched_themes": all_matched
        }

    def batch_classify(self, texts: List[str]) -> List[Dict[str, Any]]:
        return [self.classify_text(t) for t in texts]

    def aggregate_theme_trends(
        self,
        target_df: pd.DataFrame,
        baseline_df: pd.DataFrame,
        target_days: int,
        baseline_days: int
    ) -> List[Dict[str, Any]]:
        """
        Calculates theme counts, daily rates, and relative velocity between baseline and target periods.
        """
        target_texts = target_df['description'].dropna().tolist() if not target_df.empty else []
        baseline_texts = baseline_df['description'].dropna().tolist() if not baseline_df.empty else []

        target_classes = self.batch_classify(target_texts)
        baseline_classes = self.batch_classify(baseline_texts)

        target_counts: Dict[str, int] = {}
        for c in target_classes:
            t = c['primary_theme']
            target_counts[t] = target_counts.get(t, 0) + 1

        baseline_counts: Dict[str, int] = {}
        for c in baseline_classes:
            t = c['primary_theme']
            baseline_counts[t] = baseline_counts.get(t, 0) + 1

        all_themes = set(self.themes + list(target_counts.keys()) + list(baseline_counts.keys()))
        all_themes.discard("GENERAL")

        t_days = max(target_days, 1)
        b_days = max(baseline_days, 1)

        theme_results = []
        for theme in all_themes:
            t_cnt = target_counts.get(theme, 0)
            b_cnt = baseline_counts.get(theme, 0)

            t_rate = t_cnt / float(t_days)
            b_rate = b_cnt / float(b_days)

            # Velocity multiplier with laplace smoothing
            velocity = (t_rate + 0.02) / (b_rate + 0.02)
            diff = t_cnt - b_cnt

            theme_results.append({
                "theme": theme,
                "target_count": t_cnt,
                "baseline_count": b_cnt,
                "target_daily_rate": round(t_rate, 2),
                "baseline_daily_rate": round(b_rate, 2),
                "velocity_multiplier": round(velocity, 2),
                "count_change": diff
            })

        theme_results.sort(key=lambda x: x["velocity_multiplier"], reverse=True)
        return theme_results

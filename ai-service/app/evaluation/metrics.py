"""
Statistical evaluation and calibration metrics for AI models.
"""
from typing import List, Dict, Any
import numpy as np

def compute_mean_squared_error(actual: List[float], predicted: List[float]) -> float:
    a, p = np.array(actual), np.array(predicted)
    return float(np.mean((a - p) ** 2))

def compute_mean_absolute_error(actual: List[float], predicted: List[float]) -> float:
    a, p = np.array(actual), np.array(predicted)
    return float(np.mean(np.abs(a - p)))

def evaluate_calibration_score(predicted_probs: List[float], true_outcomes: List[int], bins: int = 5) -> Dict[str, Any]:
    """
    Computes expected calibration error (ECE) to ensure confidence probabilities are trustworthy.
    """
    probs = np.array(predicted_probs)
    outcomes = np.array(true_outcomes)
    bin_boundaries = np.linspace(0, 1, bins + 1)
    ece = 0.0

    for i in range(bins):
        bin_mask = (probs >= bin_boundaries[i]) & (probs < bin_boundaries[i + 1])
        if np.sum(bin_mask) > 0:
            bin_acc = np.mean(outcomes[bin_mask])
            bin_conf = np.mean(probs[bin_mask])
            ece += np.sum(bin_mask) * np.abs(bin_acc - bin_conf)

    ece /= len(probs) if len(probs) > 0 else 1.0
    return {"expected_calibration_error": float(ece)}

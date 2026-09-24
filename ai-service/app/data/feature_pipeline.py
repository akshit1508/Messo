"""
Feature pipeline for MESO AI microservice.
Extracts and derives rolling metrics strictly from the discovered schema:
- Ratings: rolling averages, count, rating drops
- Menu: frequency 7d, 14d, 30d, repetition score
- Complaints: counts, categories, velocity
- Polls: vote share, participation
"""

import pandas as pd
import numpy as np
from datetime import date, timedelta
from typing import List, Dict, Any, Optional

class FeaturePipeline:
    """
    Transforms raw MESO relational records into AI-ready numerical and categorical feature matrices.
    """

    @staticmethod
    def compute_menu_repetition(
        menu_df: pd.DataFrame,
        reference_date: date,
        window_days: int = 7
    ) -> pd.DataFrame:
        """
        Computes how frequently each food appeared in the specified window before reference_date.
        Expected columns: ['menu_date', 'food_id', 'food_name']
        """
        if menu_df.empty:
            return pd.DataFrame(columns=['food_id', 'frequency_count', 'repetition_score'])

        start_date = reference_date - timedelta(days=window_days)
        mask = (menu_df['menu_date'] >= start_date) & (menu_df['menu_date'] < reference_date)
        window_subset = menu_df.loc[mask]

        freq = window_subset.groupby('food_id').size().reset_index(name='frequency_count')
        # Repetition score: normalized frequency against total days in window
        freq['repetition_score'] = freq['frequency_count'] / float(window_days)
        return freq

    @staticmethod
    def compute_rating_shifts(
        reviews_df: pd.DataFrame,
        reference_date: date,
        recent_window_days: int = 7,
        baseline_window_days: int = 30
    ) -> pd.DataFrame:
        """
        Compares recent rating average against 30-day baseline to detect significant rating drops.
        Expected columns: ['review_date', 'food_id', 'rating']
        """
        if reviews_df.empty:
            return pd.DataFrame(columns=['food_id', 'recent_avg', 'baseline_avg', 'rating_drop'])

        recent_start = reference_date - timedelta(days=recent_window_days)
        baseline_start = reference_date - timedelta(days=baseline_window_days)

        recent_mask = (reviews_df['review_date'] >= recent_start) & (reviews_df['review_date'] < reference_date)
        baseline_mask = (reviews_df['review_date'] >= baseline_start) & (reviews_df['review_date'] < recent_start)

        recent_grp = reviews_df.loc[recent_mask].groupby('food_id')['rating'].agg(['mean', 'count']).rename(
            columns={'mean': 'recent_avg', 'count': 'recent_count'}
        )
        baseline_grp = reviews_df.loc[baseline_mask].groupby('food_id')['rating'].agg(['mean', 'count']).rename(
            columns={'mean': 'baseline_avg', 'count': 'baseline_count'}
        )

        merged = pd.merge(recent_grp, baseline_grp, left_index=True, right_index=True, how='outer')
        merged['rating_drop'] = merged['baseline_avg'] - merged['recent_avg']
        return merged.reset_index()

    @staticmethod
    def compute_complaint_signals(
        complaints_df: pd.DataFrame,
        reference_date: date,
        window_days: int = 7
    ) -> Dict[str, Any]:
        """
        Aggregates complaint volume and category breakdown over the window.
        Expected columns: ['created_at', 'type', 'description']
        """
        if complaints_df.empty:
            return {'total_count': 0, 'by_type': {}, 'oil_mentions': 0, 'repetition_mentions': 0}

        start_date = pd.to_datetime(reference_date) - pd.Timedelta(days=window_days)
        complaints_df['created_at'] = pd.to_datetime(complaints_df['created_at'])
        mask = (complaints_df['created_at'] >= start_date) & (complaints_df['created_at'] <= pd.to_datetime(reference_date))
        window_subset = complaints_df.loc[mask]

        total = len(window_subset)
        by_type = window_subset.groupby('type').size().to_dict() if total > 0 else {}

        # Semantic keywords count
        oil_mentions = window_subset['description'].str.contains('oil|greasy', case=False, na=False).sum() if total > 0 else 0
        rep_mentions = window_subset['description'].str.contains('repetitive|often|variety', case=False, na=False).sum() if total > 0 else 0

        return {
            'total_count': int(total),
            'by_type': by_type,
            'oil_mentions': int(oil_mentions),
            'repetition_mentions': int(rep_mentions)
        }

    @staticmethod
    def compute_poll_preference(
        votes_df: pd.DataFrame,
        poll_id: int
    ) -> pd.DataFrame:
        """
        Computes vote share and participation metrics for a given poll.
        Expected columns: ['poll_id', 'option_id', 'food_name', 'user_id']
        """
        if votes_df.empty:
            return pd.DataFrame(columns=['food_name', 'vote_count', 'vote_share'])

        poll_votes = votes_df[votes_df['poll_id'] == poll_id]
        total_votes = len(poll_votes)
        if total_votes == 0:
            return pd.DataFrame(columns=['food_name', 'vote_count', 'vote_share'])

        counts = poll_votes.groupby('food_name').size().reset_index(name='vote_count')
        counts['vote_share'] = counts['vote_count'] / float(total_votes)
        return counts.sort_values(by='vote_count', ascending=False)

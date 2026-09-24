"""
Database client for MESO AI microservice.
Queries the MySQL database 'messo' directly using PyMySQL for maximum query performance.
"""

import os
from typing import Optional, Dict, Any, List
from datetime import date, datetime
import pymysql
import pandas as pd

class MesoDbClient:
    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        database: Optional[str] = None
    ):
        self.host = host or os.getenv("MYSQL_HOST", "localhost")
        self.port = int(port or os.getenv("MYSQL_PORT", 3306))
        self.user = user or os.getenv("MYSQL_USER", "root")
        self.password = password or os.getenv("MYSQL_PASSWORD", "root")
        self.database = database or os.getenv("MYSQL_DATABASE", "messo")

    def _get_connection(self):
        return pymysql.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            database=self.database,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor
        )

    def get_reviews(
        self,
        start_date: date,
        end_date: date,
        meal_type: Optional[str] = None,
        food_id: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Fetches student food reviews joining with foods table for mealType and foodName.
        """
        query = """
            SELECT 
                fr.id,
                fr.rating,
                fr.review_date,
                fr.food_id,
                f.name AS food_name,
                f.meal_type,
                fr.user_id
            FROM food_reviews fr
            JOIN foods f ON fr.food_id = f.id
            WHERE fr.review_date >= %s AND fr.review_date <= %s
        """
        params: List[Any] = [start_date.isoformat(), end_date.isoformat()]

        if meal_type:
            query += " AND LOWER(f.meal_type) = LOWER(%s)"
            params.append(meal_type)
        if food_id:
            query += " AND fr.food_id = %s"
            params.append(food_id)

        query += " ORDER BY fr.review_date ASC"

        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
                df = pd.DataFrame(rows)
                if not df.empty:
                    df['review_date'] = pd.to_datetime(df['review_date']).dt.date
                else:
                    df = pd.DataFrame(columns=[
                        'id', 'rating', 'review_date', 'food_id', 'food_name', 'meal_type', 'user_id'
                    ])
                return df

    def get_menu_history(
        self,
        start_date: date,
        end_date: date
    ) -> pd.DataFrame:
        """
        Fetches daily menu sequence joining with foods table.
        """
        query = """
            SELECT 
                dm.id,
                dm.menu_date,
                dm.food_id,
                f.name AS food_name,
                f.meal_type
            FROM daily_menu dm
            JOIN foods f ON dm.food_id = f.id
            WHERE dm.menu_date >= %s AND dm.menu_date <= %s
            ORDER BY dm.menu_date ASC
        """
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, [start_date.isoformat(), end_date.isoformat()])
                rows = cur.fetchall()
                df = pd.DataFrame(rows)
                if not df.empty:
                    df['menu_date'] = pd.to_datetime(df['menu_date']).dt.date
                else:
                    df = pd.DataFrame(columns=['id', 'menu_date', 'food_id', 'food_name', 'meal_type'])
                return df

    def get_complaints(
        self,
        start_date: date,
        end_date: date,
        meal_type: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Fetches student complaints within date window.
        """
        start_dt = f"{start_date.isoformat()} 00:00:00"
        end_dt = f"{end_date.isoformat()} 23:59:59"

        query = """
            SELECT 
                c.id,
                c.type,
                c.description,
                c.rating,
                c.resolved,
                c.created_at,
                c.user_id
            FROM complaint c
            WHERE c.created_at >= %s AND c.created_at <= %s
            ORDER BY c.created_at ASC
        """
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, [start_dt, end_dt])
                rows = cur.fetchall()
                df = pd.DataFrame(rows)
                if not df.empty:
                    df['created_at'] = pd.to_datetime(df['created_at'])
                    df['complaint_date'] = df['created_at'].dt.date
                    # Infer meal type from hour if requested
                    hours = df['created_at'].dt.hour
                    df['inferred_meal'] = 'Other'
                    df.loc[(hours >= 7) & (hours <= 11), 'inferred_meal'] = 'Breakfast'
                    df.loc[(hours >= 12) & (hours <= 16), 'inferred_meal'] = 'Lunch'
                    df.loc[(hours >= 19) & (hours <= 23), 'inferred_meal'] = 'Dinner'

                    if meal_type:
                        df = df[df['inferred_meal'].str.lower() == meal_type.lower()]
                else:
                    df = pd.DataFrame(columns=[
                        'id', 'type', 'description', 'rating', 'resolved', 'created_at',
                        'user_id', 'complaint_date', 'inferred_meal'
                    ])
                return df

    def get_polls_and_votes(
        self,
        start_date: date,
        end_date: date
    ) -> pd.DataFrame:
        """
        Fetches polls, options, and vote counts between dates.
        """
        query = """
            SELECT 
                fp.id AS poll_id,
                fp.poll_date,
                fp.active,
                po.id AS option_id,
                po.food_name,
                COUNT(pv.id) AS vote_count
            FROM food_polls fp
            JOIN poll_options po ON po.poll_id = fp.id
            LEFT JOIN poll_votes pv ON pv.option_id = po.id
            WHERE fp.poll_date >= %s AND fp.poll_date <= %s
            GROUP BY fp.id, fp.poll_date, fp.active, po.id, po.food_name
            ORDER BY fp.poll_date ASC, vote_count DESC
        """
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, [start_date.isoformat(), end_date.isoformat()])
                rows = cur.fetchall()
                df = pd.DataFrame(rows)
                if not df.empty:
                    df['poll_date'] = pd.to_datetime(df['poll_date']).dt.date
                else:
                    df = pd.DataFrame(columns=[
                        'poll_id', 'poll_date', 'active', 'option_id', 'food_name', 'vote_count'
                    ])
                return df

    def get_foods(self) -> pd.DataFrame:
        query = "SELECT id, name, meal_type FROM foods ORDER BY name ASC"
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                return pd.DataFrame(cur.fetchall())

    def food_exists(self, food_name: str) -> bool:
        """
        Validates if a food name exists in the MESO database catalog (case-insensitive).
        """
        query = "SELECT id FROM foods WHERE LOWER(TRIM(name)) = LOWER(TRIM(%s)) LIMIT 1"
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, [food_name])
                return cur.fetchone() is not None

    def persist_simulation(self, sim_data: Dict[str, Any]) -> None:
        """
        Persists derived simulation results into the dedicated ai_simulation audit table.
        Does not mutate any operational tables.
        """
        import json
        query = """
            INSERT INTO ai_simulation (
                simulation_id, simulation_name, scenario_type, input_schedule,
                projected_outcomes, risk_level, key_tradeoffs, model_version, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, [
                    sim_data["simulation_id"],
                    sim_data.get("simulation_name", "What-If Simulation"),
                    sim_data.get("scenario_type", "FOOD_REPLACEMENT"),
                    json.dumps(sim_data.get("input_schedule", {})),
                    json.dumps(sim_data.get("projected_outcomes", {})),
                    sim_data.get("risk_level", "LOW"),
                    json.dumps(sim_data.get("key_tradeoffs", [])),
                    sim_data.get("model_version", "sim-engine-v1.0-mc"),
                    datetime.now()
                ])
            conn.commit()

    def get_recent_simulations(self, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Fetches recently persisted simulation results for admin history reporting.
        """
        import json
        query = """
            SELECT id, simulation_id, simulation_name, scenario_type, input_schedule,
                   projected_outcomes, risk_level, key_tradeoffs, model_version, created_at
            FROM ai_simulation
            ORDER BY created_at DESC
            LIMIT %s
        """
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, [limit])
                rows = cur.fetchall()
                results = []
                for r in rows:
                    item = dict(r)
                    if isinstance(item.get("input_schedule"), str):
                        try:
                            item["input_schedule"] = json.loads(item["input_schedule"])
                        except (json.JSONDecodeError, TypeError):
                            pass
                    if isinstance(item.get("projected_outcomes"), str):
                        try:
                            item["projected_outcomes"] = json.loads(item["projected_outcomes"])
                        except (json.JSONDecodeError, TypeError):
                            pass
                    if isinstance(item.get("key_tradeoffs"), str):
                        try:
                            item["key_tradeoffs"] = json.loads(item["key_tradeoffs"])
                        except (json.JSONDecodeError, TypeError):
                            pass
                    results.append(item)
                return results

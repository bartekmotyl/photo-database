"""Minimal PhotoDB API client (critic-side copy - the labeler has its own)."""

from __future__ import annotations

from typing import Any

import requests


class PhotoDbClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()

    def search(self, date_from: str = "", date_to: str = "") -> list[dict[str, Any]]:
        response = self.session.get(
            f"{self.base_url}/Photos/Search",
            params={"dateFrom": date_from, "dateTo": date_to, "extended": "true"},
            timeout=60,
        )
        response.raise_for_status()
        photos: list[dict[str, Any]] = response.json()
        return photos

    def thumbnail(self, photo_id: int) -> bytes:
        response = self.session.get(
            f"{self.base_url}/Photos/Thumbnail/{photo_id}", timeout=60
        )
        response.raise_for_status()
        return response.content

    def update_aesthetic_scores(self, updates: list[dict[str, Any]]) -> None:
        response = self.session.patch(
            f"{self.base_url}/Photos/UpdateAestheticScores",
            json=updates,
            timeout=120,
        )
        response.raise_for_status()

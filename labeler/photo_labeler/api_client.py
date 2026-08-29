"""Client for the PhotoDB Web API."""

from __future__ import annotations

from typing import Any

import requests


class PhotoDbClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()

    def search(
        self, date_from: str = "", date_to: str = "", tags: str = "", extended: bool = True
    ) -> list[dict[str, Any]]:
        # extended=true includes contentDescription, which marks a photo as
        # already labelled (list endpoints return a lean record by default).
        response = self.session.get(
            f"{self.base_url}/Photos/Search",
            params={
                "dateFrom": date_from,
                "dateTo": date_to,
                "tags": tags,
                "extended": "true" if extended else "false",
            },
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

    def add_tags(self, photo_id: int, tags: list[str]) -> None:
        response = self.session.patch(
            f"{self.base_url}/Photos/AddTags",
            json=[{"photoId": photo_id, "tags": tags}],
            timeout=60,
        )
        response.raise_for_status()

    def update_description(self, photo_id: int, description: str) -> None:
        response = self.session.patch(
            f"{self.base_url}/Photos/UpdateDescriptions",
            json=[{"photoId": photo_id, "contentDescription": description}],
            timeout=60,
        )
        response.raise_for_status()

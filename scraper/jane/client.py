from __future__ import annotations

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Optional

DEFAULT_TIMEOUT = 10


def _build_retry(total: int = 3) -> Retry:
    return Retry(
        total=total,
        read=total,
        connect=total,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "HEAD"]),
        raise_on_status=False,
    )


def build_session(retries: int = 3, user_agent: Optional[str] = None) -> requests.Session:
    """
    Create a requests session with retry/backoff and sane defaults.
    """
    session = requests.Session()
    adapter = HTTPAdapter(max_retries=_build_retry(retries))
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    headers = {"User-Agent": user_agent or "jspuzzle-scraper/1.0"}
    session.headers.update(headers)
    return session


def fetch_json(session: requests.Session, url: str, timeout: int = DEFAULT_TIMEOUT):
    response = session.get(url, timeout=timeout)
    response.raise_for_status()
    return response.json()


def fetch_html(session: requests.Session, url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    response = session.get(url, timeout=timeout)
    response.raise_for_status()
    return response.text



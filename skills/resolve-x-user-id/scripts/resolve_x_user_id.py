#!/usr/bin/env python3
"""Resolve X/Twitter usernames and numeric user IDs from public X pages."""

from __future__ import annotations

import argparse
from html.parser import HTMLParser
import json
import re
import shutil
import subprocess
import sys
from typing import Any, Iterator
from urllib.parse import parse_qs, quote, urlparse


SYNDICATION_URL = "https://syndication.twitter.com/srv/timeline-profile"
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{1,15}$")
URL_HOSTS = {"x.com", "twitter.com"}


class BrowserRequired(RuntimeError):
    def __init__(
        self, *, user_id: str | None = None, username: str | None = None
    ) -> None:
        self.user_id = user_id
        self.username = username
        target = (
            f"https://x.com/i/user/{user_id}"
            if user_id
            else f"https://x.com/{username}"
        )
        super().__init__(f"open {target} in a browser to complete the lookup")


class SyndicationMiss(RuntimeError):
    pass


class NextDataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.capture = False
        self.data: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "script" and dict(attrs).get("id") == "__NEXT_DATA__":
            self.capture = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self.capture:
            self.capture = False

    def handle_data(self, data: str) -> None:
        if self.capture:
            self.data.append(data)


class ProfileDataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.creators: set[str] = set()
        self.user_ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if attributes.get("name") == "twitter:creator":
            content = attributes.get("content")
            if content:
                self.creators.add(content.removeprefix("@"))
        for value in attributes.values():
            if value:
                self.user_ids.update(re.findall(r"profile_banners/(\d+)", value))


def walk(value: Any) -> Iterator[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def normalize(raw: str) -> tuple[str, str]:
    value = raw.strip()
    if not value:
        raise ValueError("input is empty")

    lower_value = value.lower()
    if "://" not in value and lower_value.startswith(
        ("x.com/", "www.x.com/", "twitter.com/", "www.twitter.com/")
    ):
        value = f"https://{value}"

    if "://" in value:
        parsed = urlparse(value)
        host = parsed.netloc.lower().removeprefix("www.")
        if host not in URL_HOSTS:
            raise ValueError("URL must use x.com or twitter.com")
        query_id = parse_qs(parsed.query).get("user_id", [])
        if query_id and query_id[0].isdigit():
            return "id", query_id[0]
        parts = [part for part in parsed.path.split("/") if part]
        if parts[:2] == ["i", "user"]:
            if len(parts) >= 3 and parts[2].isdigit():
                return "id", parts[2]
            raise ValueError("X /i/user URL must end with a numeric user ID")
        if parts[:2] == ["intent", "user"]:
            raise ValueError("X intent/user URL must contain a numeric user_id query")
        if parts:
            value = parts[0]

    value = value.removeprefix("@")
    if value.isdigit():
        return "id", value
    if USERNAME_RE.fullmatch(value):
        return "username", value
    raise ValueError("expected a numeric ID, @username, username, or X profile URL")


def fetch_text(url: str) -> str:
    curl = shutil.which("curl")
    if not curl:
        raise RuntimeError("curl is required but was not found")
    result = subprocess.run(
        [
            curl,
            "--location",
            "--silent",
            "--show-error",
            "--max-time",
            "20",
            "--write-out",
            "\n%{http_code}",
            url,
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"cannot fetch {url}: {result.stderr.strip()}")
    html, separator, status = result.stdout.rpartition("\n")
    if not separator or status != "200":
        detail = "rate limit exhausted" if status == "429" else f"HTTP {status}"
        raise RuntimeError(f"{url} returned {detail}")
    return html


def fetch_syndication(route: str) -> dict[str, Any]:
    html = fetch_text(f"{SYNDICATION_URL}/{route}")
    parser = NextDataParser()
    parser.feed(html)
    if not parser.data:
        raise RuntimeError(
            "X syndication response has no __NEXT_DATA__; schema may have changed"
        )
    try:
        return json.loads("".join(parser.data))
    except json.JSONDecodeError as exc:
        raise RuntimeError("X syndication returned invalid __NEXT_DATA__") from exc


def find_by_username(data: dict[str, Any], username: str) -> tuple[str, str]:
    for obj in walk(data):
        screen_name = obj.get("screen_name")
        user_id = obj.get("id_str")
        if (
            isinstance(screen_name, str)
            and screen_name.casefold() == username.casefold()
            and isinstance(user_id, str)
            and user_id.isdigit()
        ):
            return user_id, screen_name
    entries = data.get("props", {}).get("pageProps", {}).get("timeline", {}).get(
        "entries"
    )
    if entries == []:
        raise SyndicationMiss(
            f"X syndication recognized @{username} but returned an empty timeline"
        )
    raise SyndicationMiss(f"X syndication returned no user object for @{username}")


def find_by_id(data: dict[str, Any], user_id: str) -> tuple[str, str]:
    for obj in walk(data):
        screen_name = obj.get("screen_name")
        if obj.get("id_str") == user_id and isinstance(screen_name, str):
            return user_id, screen_name
    entries = data.get("props", {}).get("pageProps", {}).get("timeline", {}).get(
        "entries"
    )
    if entries == []:
        raise SyndicationMiss(
            f"X syndication recognized user ID {user_id} but returned an empty timeline"
        )
    raise SyndicationMiss(f"X syndication returned no user object for ID {user_id}")


def find_profile_by_username(username: str) -> tuple[str, str]:
    html = fetch_text(f"https://x.com/{quote(username)}")
    parser = ProfileDataParser()
    parser.feed(html)
    matched_creators = {
        creator
        for creator in parser.creators
        if creator.casefold() == username.casefold()
    }
    if not matched_creators:
        raise RuntimeError(f"X profile metadata did not confirm @{username}")

    if not parser.user_ids:
        raise BrowserRequired(username=username)
    if len(parser.user_ids) != 1:
        raise RuntimeError(
            f"X profile metadata exposed multiple banner owner IDs for @{username}"
        )
    return parser.user_ids.pop(), matched_creators.pop()


def build_result(user_id: str, username: str, source: str) -> dict[str, Any]:
    return {
        "id": user_id,
        "username": username,
        "profile_url": f"https://x.com/{username}",
        "id_profile_url": f"https://x.com/i/user/{user_id}",
        "source": source,
        "verified": True,
    }


def resolve(kind: str, value: str) -> dict[str, Any]:
    if kind == "username":
        try:
            user_id, username = find_by_username(
                fetch_syndication(f"screen-name/{quote(value)}"), value
            )
            return build_result(user_id, username, "x-syndication")
        except RuntimeError:
            user_id, username = find_profile_by_username(value)
            return build_result(user_id, username, "x-profile-html")

    try:
        user_id, username = find_by_id(
            fetch_syndication(f"user-id/{quote(value)}"), value
        )
        return build_result(user_id, username, "x-syndication")
    except RuntimeError as exc:
        raise BrowserRequired(user_id=value) from exc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Resolve an X/Twitter username or numeric user ID."
    )
    parser.add_argument(
        "account", help="numeric ID, @username, username, or profile URL"
    )
    args = parser.parse_args()

    try:
        kind, value = normalize(args.account)
        print(json.dumps(resolve(kind, value), ensure_ascii=False, indent=2))
        return 0
    except BrowserRequired as exc:
        print(
            json.dumps(
                {
                    "error": "browser_required",
                    "detail": str(exc),
                    "id": exc.user_id,
                    "username": exc.username,
                    "id_profile_url": (
                        f"https://x.com/i/user/{exc.user_id}"
                        if exc.user_id
                        else None
                    ),
                    "profile_url": (
                        f"https://x.com/{exc.username}" if exc.username else None
                    ),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2
    except (ValueError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

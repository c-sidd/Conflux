import logging
import re
import sys
from typing import Any, Dict


REDACT_PATTERNS = [
    re.compile(r'(refresh_token["\':\s=]+)([^"\',\s&]+)', re.IGNORECASE),
    re.compile(r'(access_token["\':\s=]+)([^"\',\s&]+)', re.IGNORECASE),
    re.compile(r'(password["\':\s=]+)([^"\',\s&]+)', re.IGNORECASE),
    re.compile(r'(client_secret["\':\s=]+)([^"\',\s&]+)', re.IGNORECASE),
    re.compile(r'(session_secret["\':\s=]+)([^"\',\s&]+)', re.IGNORECASE),
    re.compile(r'(token_hash["\':\s=]+)([^"\',\s&]+)', re.IGNORECASE),
]


def redact_sensitive_data(message: str) -> str:
    redacted = message
    for pattern in REDACT_PATTERNS:
        redacted = pattern.sub(r'\1[REDACTED]', redacted)
    return redacted


class SafeRedactingFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        orig = super().format(record)
        return redact_sensitive_data(orig)


def setup_logging(log_level: str = "INFO") -> None:
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Clear existing handlers
    for handler in list(logger.handlers):
        logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    formatter = SafeRedactingFormatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] [%(filename)s:%(lineno)d] %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)


logger = logging.getLogger("conflux")

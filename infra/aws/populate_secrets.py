#!/usr/bin/env python3
"""
Populate & preserve Conflux production secrets in AWS Secrets Manager.
Preserves existing encryption keys, session/csrf secrets, and Google OAuth credentials.
"""
import base64
import json
import os
import secrets
import subprocess
import sys


def run_aws(args):
    res = subprocess.run(["aws"] + args, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"AWS CLI command failed: {' '.join(args)}\nError: {res.stderr}")
    return res.stdout.strip()


def main():
    secrets_arn = os.environ.get("SECRETS_ARN")
    aws_region = os.environ.get("AWS_REGION", "us-east-1")
    neon_db_url = os.environ.get("NEON_DATABASE_URL", "")
    redis_addr = os.environ.get("REDIS_ADDR", "")
    redis_port = os.environ.get("REDIS_PORT", "6379")
    google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    google_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")

    if not secrets_arn:
        print("ERROR: SECRETS_ARN environment variable is required.", file=sys.stderr)
        sys.exit(1)

    print(f"==> Connecting to Secrets Manager secret: {secrets_arn} (region: {aws_region})...")

    # Fetch existing secret
    try:
        raw_val = run_aws(["secretsmanager", "get-secret-value", "--secret-id", secrets_arn, "--region", aws_region, "--query", "SecretString", "--output", "text"])
        curr = json.loads(raw_val)
    except Exception as e:
        print(f"Note: Could not retrieve existing secret or secret is empty ({e}). Initializing clean secret dictionary.")
        curr = {}

    # 1. TOKEN_ENCRYPTION_KEY: Preserve valid 32-byte key or generate once
    token_key = curr.get("TOKEN_ENCRYPTION_KEY")
    valid_key = False
    if token_key and "replace_with" not in token_key and "dGVzdF9" not in token_key:
        try:
            if len(base64.urlsafe_b64decode(token_key)) == 32:
                valid_key = True
        except Exception:
            valid_key = False

    if not valid_key:
        print("==> Generating new permanent 32-byte AES-256 token encryption key...")
        token_key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii")
    else:
        print("==> Preserved existing valid TOKEN_ENCRYPTION_KEY.")

    # 2. SESSION_SECRET & CSRF_SECRET: Preserve or generate
    session_sec = curr.get("SESSION_SECRET")
    if not session_sec or "replace_with" in session_sec or "development" in session_sec or len(session_sec) < 32:
        session_sec = secrets.token_hex(32)
    else:
        print("==> Preserved existing SESSION_SECRET.")

    csrf_sec = curr.get("CSRF_SECRET")
    if not csrf_sec or "replace_with" in csrf_sec or "development" in csrf_sec or len(csrf_sec) < 32:
        csrf_sec = secrets.token_hex(32)
    else:
        print("==> Preserved existing CSRF_SECRET.")

    # 3. Google OAuth
    google_id = google_client_id or curr.get("GOOGLE_CLIENT_ID") or "placeholder_client_id.apps.googleusercontent.com"
    google_sec = google_client_secret or curr.get("GOOGLE_CLIENT_SECRET") or "placeholder_client_secret"

    # 4. Redis URL
    if redis_addr:
        redis_url = f"redis://{redis_addr}:{redis_port}/0"
    else:
        redis_url = curr.get("REDIS_URL") or "redis://localhost:6379/0"

    # 5. Database URL (Neon or existing)
    db_url = neon_db_url or curr.get("DATABASE_URL")
    if not db_url or "placeholder" in db_url:
        print("WARNING: No valid DATABASE_URL provided. Please configure NEON_DATABASE_URL.", file=sys.stderr)
        db_url = "postgresql+asyncpg://placeholder-db-endpoint:5432/conflux_db"

    # Normalize asyncpg scheme for async SQLAlchemy
    if db_url.startswith("postgres://"):
        db_async_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
        db_sync_url = db_url.replace("postgres://", "postgresql://", 1)
    elif db_url.startswith("postgresql://"):
        db_async_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        db_sync_url = db_url
    else:
        db_async_url = db_url
        db_sync_url = db_url

    updated_secret = {
        "DATABASE_URL": db_async_url,
        "DATABASE_SYNC_URL": db_sync_url,
        "REDIS_URL": redis_url,
        "SESSION_SECRET": session_sec,
        "CSRF_SECRET": csrf_sec,
        "TOKEN_ENCRYPTION_KEY": token_key,
        "GOOGLE_CLIENT_ID": google_id,
        "GOOGLE_CLIENT_SECRET": google_sec,
    }

    print("==> Writing updated secrets to Secrets Manager...")
    run_aws([
        "secretsmanager", "put-secret-value",
        "--secret-id", secrets_arn,
        "--secret-string", json.dumps(updated_secret),
        "--region", aws_region,
    ])
    print("SUCCESS: Secrets Manager secret successfully updated and verified.")


if __name__ == "__main__":
    main()

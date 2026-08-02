import os
import sys
import smtplib
import socket
import django

def diagnose_email_system():
    print("=== Conflux Email Infrastructure Diagnostics ===")
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dcs.settings')
    try:
        django.setup()
    except Exception as e:
        print(f"ERROR: Django setup failed: {str(e)}")
        return

    from django.conf import settings
    print(f"\n1. Loaded Django Settings:")
    print(f"   - EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"   - EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"   - EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"   - EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"   - EMAIL_HOST_USER: {settings.EMAIL_HOST_USER if settings.EMAIL_HOST_USER else 'EMPTY (Console fallback mode)'}")
    print(f"   - DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"   - FRONTEND_URL: {settings.FRONTEND_URL}")

    # Check if console mode is active
    if "console" in settings.EMAIL_BACKEND:
        print("\n[INFO] Console backend is active because EMAIL_HOST_USER is empty in .env.")
        print("   Emails will be printed to terminal output instead of sent over SMTP.")
        print("   If you want to test SMTP/Gmail, populate EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in your .env.")
        return

    print("\n2. Testing SMTP Network Connection & Authentication:")
    print(f"   Attempting connection to {settings.EMAIL_HOST}:{settings.EMAIL_PORT}...")

    try:
        # Check port reachability first
        socket.setdefaulttimeout(10.0)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((settings.EMAIL_HOST, settings.EMAIL_PORT))
        print("   [SUCCESS] SMTP Port is open and reachable.")
        sock.close()
    except socket.timeout:
        print("   [ERROR] Connection timed out. The SMTP port is blocked by your firewall or network.")
        return
    except Exception as e:
        print(f"   [ERROR] Socket connection failed: {str(e)}")
        return

    # Real SMTP connection test with smtplib
    try:
        smtp = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15)
        smtp.set_debuglevel(1)  # Output full transaction logs
        
        print("\n--- Start SMTP Session Debug Output ---")
        smtp.ehlo()
        if settings.EMAIL_USE_TLS:
            smtp.starttls()
            smtp.ehlo()
            
        if settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD:
            print(f"   Authenticating user: {settings.EMAIL_HOST_USER}...")
            smtp.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            print("   [SUCCESS] SMTP Authentication succeeded.")
        else:
            print("   [WARNING] No credentials provided. Attempting anonymous SMTP send...")
            
        smtp.quit()
        print("--- End SMTP Session Debug Output ---\n")
        print("[PASSED] SMTP Infrastructure check completed.")

    except smtplib.SMTPAuthenticationError as e:
        print("\n--- End SMTP Session Debug Output ---\n")
        print(f"[ERROR] SMTP Authentication failed: {str(e)}")
        print("   Root Cause: Invalid email address, incorrect App Password, or Gmail account restriction.")
        print("   Action required: Generate a new 16-character App Password under your Google Account Security settings.")
    except Exception as e:
        print("\n--- End SMTP Session Debug Output ---\n")
        print(f"[ERROR] SMTP session failed: {str(e)}")

if __name__ == "__main__":
    diagnose_email_system()

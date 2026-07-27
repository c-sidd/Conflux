"""
Future Authentication Extensions (Phase 4 Placeholders)
This module reserves architectural extension hooks so future authentication mechanisms 
(MFA, Passkeys/WebAuthn, Social OAuth, Enterprise SSO, Magic Links, Recovery Codes) 
can be integrated cleanly without modifying the core authentication pipeline.
"""

class MFAExtensionProvider:
    """Placeholder interface for TOTP / Authenticator app multi-factor authentication."""
    @staticmethod
    def generate_totp_secret(user):
        raise NotImplementedError("MFA extension is planned for Phase 4.")

    @staticmethod
    def verify_totp_code(user, code):
        raise NotImplementedError("MFA extension is planned for Phase 4.")

class PasskeyWebAuthnProvider:
    """Placeholder interface for FIDO2 / WebAuthn Passkeys."""
    @staticmethod
    def begin_passkey_registration(user):
        raise NotImplementedError("Passkeys extension is planned for Phase 4.")

    @staticmethod
    def verify_passkey_assertion(credential):
        raise NotImplementedError("Passkeys extension is planned for Phase 4.")

class OAuthSocialLoginProvider:
    """Placeholder interface for GitHub / Microsoft / Apple social identity providers."""
    @staticmethod
    def authenticate_provider(provider_name, code):
        raise NotImplementedError("OAuth extension is planned for Phase 4.")

class EnterpriseSSOProvider:
    """Placeholder interface for SAML 2.0 / OIDC Enterprise Single Sign-On."""
    @staticmethod
    def process_saml_response(saml_data):
        raise NotImplementedError("Enterprise SSO extension is planned for Phase 4.")

class MagicLinkLoginProvider:
    """Placeholder interface for Passwordless Magic Link Login."""
    @staticmethod
    def generate_magic_link(email):
        raise NotImplementedError("Magic Link extension is planned for Phase 4.")

class RecoveryCodeProvider:
    """Placeholder interface for emergency account recovery codes."""
    @staticmethod
    def generate_recovery_codes(user):
        raise NotImplementedError("Recovery Codes extension is planned for Phase 4.")

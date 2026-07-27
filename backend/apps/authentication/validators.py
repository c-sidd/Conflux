import re
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password as django_validate_password

class SpecialCharacterPasswordValidator:
    """
    Validates that the password contains at least one special character.
    """
    def validate(self, password, user=None):
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>/?\\|`~]', password):
            raise ValidationError(
                "Password must contain at least one special character (!@#$%^&* etc.).",
                code='password_no_symbol',
            )

    def get_help_text(self):
        return "Your password must contain at least one special character."

class UppercasePasswordValidator:
    """
    Validates that the password contains at least one uppercase letter.
    """
    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                "Password must contain at least one uppercase letter.",
                code='password_no_uppercase',
            )

    def get_help_text(self):
        return "Your password must contain at least one uppercase letter."

def validate_complex_password(password, user=None):
    """
    Runs full Django password validators suite plus custom uppercase and symbol checks.
    """
    django_validate_password(password, user=user)
    UppercasePasswordValidator().validate(password, user=user)
    SpecialCharacterPasswordValidator().validate(password, user=user)

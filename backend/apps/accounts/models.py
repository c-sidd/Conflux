from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # Additional fields can be added here
    # Google OAuth usually requires email to be unique
    email = models.EmailField(unique=True)

    def __str__(self):
        return self.username

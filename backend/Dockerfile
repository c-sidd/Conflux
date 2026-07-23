FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
# COPY requirements /app/requirements
# RUN pip install --upgrade pip && pip install -r requirements/local.txt

# We'll rely on the virtual env for local development or install requirements once generated.
# For now this is a placeholder that will be completed when requirements.txt is generated.

# Copy project
COPY . /app/

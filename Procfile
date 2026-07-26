web: sh -c "python backend/manage.py migrate --noinput && gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 4 dcs.wsgi:application"

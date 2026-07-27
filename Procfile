web: sh -c "python manage.py migrate --noinput && gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 4 --timeout 120 --access-logfile - --error-logfile - --log-level debug dcs.wsgi:application"

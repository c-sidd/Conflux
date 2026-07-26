# Conflux Production Deployment Reference

For detailed deployment instructions for Vercel, Railway, Neon, and Upstash, please refer to:
[docs/Deployment.md](file:///d:/CD/docs/Deployment.md)

## Quick Environment Variable Template

```env
SECRET_KEY="c0nflux_pr0duct10n_s3cr3t_k3y_98213_x9z_l0ng_and_sec129038102938"
DEBUG=False
ALLOWED_HOSTS=".railway.app,.vercel.app"

DATABASE_URL="postgresql://username:password@ep-cool-db.neon.tech/neondb?sslmode=require"
CELERY_BROKER_URL="rediss://default:password@upstash.io:6379"

GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

NEXT_PUBLIC_API_URL="https://your-backend.up.railway.app"
```

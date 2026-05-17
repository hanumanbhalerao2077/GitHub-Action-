# SkillPulse Load Test (k6)

Runs lightweight, read-only traffic against the API.

## Run locally

```bash
# backend must be reachable from where you run k6
BASE_URL=http://localhost:8080 k6 run load/k6/skillpulse-load.js
```

If you're using Docker Compose and hit via Nginx:

```bash
BASE_URL=http://localhost k6 run load/k6/skillpulse-load.js
```

## Environment variables
- `BASE_URL` (optional): default `http://localhost`

## Notes
- The script intentionally avoids POST endpoints by default (read-only load).
- You can enable write-load by uncommenting the POST block inside the script.


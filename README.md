# Mukja Order

Mobile-first PWA for Mokja Alley restaurant ingredient ordering, recipe lookup, order history, and admin CSV management.

## Local Preview

```bash
python3 -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173
```

## Deploy

This project is static and Netlify-ready. The publish directory is the repository root.

## Data Direction

The current app can run locally with `localStorage`. The next planned step is moving order, receiving, and department confirmation data to a shared database-backed API for multi-device use.

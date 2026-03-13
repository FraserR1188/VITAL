# Beam API

Backend service for the Beam MVP.

## Current scope

- Email/password auth via JWT
- Invite-only organisation membership
- Custom user model
- Organisation, invite, post, reaction, comment, and notification models
- Feed, team, auth, and notification API endpoints
- Django admin for moderation and user control

## Run locally

```powershell
cd "C:\Users\robfr\Documents\New project\beam-api"
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py createsuperuser
..\.venv\Scripts\python.exe manage.py runserver
```

## Demo seed

```powershell
cd "C:\Users\robfr\Documents\New project\beam-api"
..\.venv\Scripts\python.exe manage.py seed_demo
```

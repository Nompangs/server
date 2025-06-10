# QR Backend

This directory contains a simple Node.js/Firebase Cloud Functions backend for managing QR profiles.

## Setup

1. Install the Firebase CLI and Node.js (v18 recommended).
2. From this `server/` directory run `npm install` to install dependencies.
3. Ensure your Firebase project is configured and you are logged in using `firebase login`.

## Running Locally

```
npm start
```

This will start an Express server on `http://localhost:8080`. The Firebase Admin SDK uses your application default credentials, so set `GOOGLE_APPLICATION_CREDENTIALS` if necessary.

## Deploying to Cloud Functions

```
firebase deploy --only functions
```

This deploys the Express app as `api` Cloud Function. After deployment you can access the endpoints via:

- `POST https://<region>-<project>.cloudfunctions.net/api/createQR`
- `GET  https://<region>-<project>.cloudfunctions.net/api/loadQR/{uuid}`

Make sure your Firestore database is in native mode.

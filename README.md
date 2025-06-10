# QR Backend

This directory contains a simple Node.js/Firebase Cloud Functions backend for managing QR profiles. Profiles are
stored in Firestore using a randomly generated UUID. The server also returns a QR code image that encodes that UUID.

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
  - Body: object profile fields. Returns `{ personaId, qrUrl }` where `qrUrl` is a signed PNG URL.
- `GET  https://<region>-<project>.cloudfunctions.net/api/loadQR/{personaId}`

Make sure your Firestore database is in native mode.

## Profile Data Fields

Profiles created via `createQR` contain the following properties:

- `personaId` – unique identifier stored as the Firestore document ID.
- `name` – the nickname of the object.
- `objectType` – type of object created (e.g. "머그컵").
- `location` – where the object is kept.
- `duration` – how long the user has had the object.
- `purpose` – description of what role the object plays.
- `humorStyle` – selected humor or personality tone.
- `greeting` – greeting shown on the completion screen.
- `tags` – list of personality traits.
- `finalPersonality` – object containing `introversion`, `warmth`, and `competence` values.
- `photoUrl` – optional image URL.
- `createdBy`, `createdAt` – creator info and timestamp.
- `totalInteractions`, `uniqueUsers` – usage analytics counters.


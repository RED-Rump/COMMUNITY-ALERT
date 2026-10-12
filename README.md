# CommunityAlert

A resident-facing outage status app and admin dashboard for water and power interruptions. Residents can check their neighborhood without an account; administrators sign in to publish and resolve updates.

## Current scope

The initial build covers the demoable core: Firebase setup, admin sign-in, outage creation, resident live status, and outage resolution. Push notifications, the illustrative SMS screen, PWA installation, and hosting deployment are later milestones. SMS is a mockup only; this app does not connect to utility systems.

## Run locally

1. Install Node.js (18 or newer).
2. Create a Firebase project and register a Web App.
3. Enable **Cloud Firestore** and **Email/Password** in Firebase Authentication.
4. Copy `.env.example` to `.env` and fill in the Web App configuration values from Firebase project settings.
5. Install dependencies and start the development server:

   ```sh
   npm install
   npm run dev
   ```

6. In Firestore, create a `zones` collection and add 3–5 documents with a `name` field (for example: `Northside`, `Riverside`, `Central`).
7. Create an admin user in Firebase Authentication, then open `/admin` and sign in.

Residents can open `/` and select their neighborhood. Firestore listeners keep the resident status and admin outage list in sync. Marking an outage resolved changes its status and displays the restored-service state to residents.

## Firebase rules and hosting

The repository includes `firestore.rules` and a Hosting configuration. Review and deploy the rules to your Firebase project before using real data. Once the Firebase CLI is installed and authenticated, run:

```sh
npx firebase-tools deploy --only firestore:rules,hosting
```

The Firebase API configuration in `.env` is a public client configuration, not an admin credential. Never put service-account keys or other privileged secrets in client-side environment variables.

## Data

- `zones`: `{ name, createdAt }`
- `outages`: zone, utility, severity, message and variant, status, timestamps, and creator UID
- `subscribers`: reserved for the FCM milestone

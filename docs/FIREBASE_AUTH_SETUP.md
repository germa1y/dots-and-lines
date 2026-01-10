# Firebase Authentication Setup

This document explains how to enable Anonymous Authentication in the Firebase Console for the Dots and Lines project.

## Problem

The game is receiving error `auth/configuration-not-found` when attempting anonymous sign-in. This means Authentication has not been configured in the Firebase Console.

## Prerequisites

- Access to the Firebase Console with permissions to the `dots-and-lines-game` project
- Google account with owner/editor access to the project

## Step-by-Step Instructions

### 1. Open Firebase Console

Navigate to the Firebase Console:
```
https://console.firebase.google.com/
```

### 2. Select the Project

1. Click on the **dots-and-lines-game** project from your project list
2. If you don't see the project, ensure you're signed in with the correct Google account

### 3. Navigate to Authentication

1. In the left sidebar, click on **Build** to expand the menu
2. Click on **Authentication**
3. If this is your first time setting up Authentication, click **Get started**

### 4. Enable Anonymous Authentication

1. Click on the **Sign-in method** tab at the top
2. In the list of sign-in providers, find **Anonymous**
3. Click on the **Anonymous** row to expand it
4. Toggle the **Enable** switch to ON
5. Click **Save**

### 5. Verify Configuration

After enabling, you should see:
- Anonymous listed as "Enabled" in the Sign-in providers list
- A green checkmark or "Enabled" status indicator

## Verification

To verify the setup is complete:

1. Open the game in a browser
2. Open the browser's Developer Tools (F12)
3. Check the Console tab for the message: `Signed in anonymously: <user-id>`
4. If you see an error instead, double-check the steps above

## Additional Notes

### Why Anonymous Authentication?

Anonymous authentication allows players to:
- Join games without creating an account
- Maintain a persistent identity during a game session
- Have their moves attributed to them in the database

The anonymous user ID is used to:
- Track which player is which in multiplayer games
- Enforce turn-based gameplay
- Manage game hosting privileges

### Firebase CLI Limitation

The Firebase CLI (`firebase auth:*` commands) does not support enabling authentication providers. This configuration must be done through the Firebase Console web interface.

Available Firebase CLI auth commands are limited to:
- `firebase auth:export` - Export user accounts
- `firebase auth:import` - Import user accounts

### Security Rules

The Firebase Realtime Database rules are already configured to work with authenticated users. No additional rules changes are needed after enabling Anonymous authentication.

## Troubleshooting

### Error: auth/configuration-not-found
- Anonymous authentication is not enabled in the Firebase Console
- Follow the steps above to enable it

### Error: auth/network-request-failed
- Check your internet connection
- Verify the Firebase project is accessible

### Error: auth/too-many-requests
- Rate limiting is in effect
- Wait a few minutes and try again

## Related Files

- `js/firebase.js` - Firebase configuration and authentication code
- `database.rules.json` - Realtime Database security rules
- `.firebaserc` - Firebase project configuration

## Contact

If you continue to have issues, check:
1. Firebase Console status: https://status.firebase.google.com/
2. Firebase project settings match the configuration in `js/firebase.js`

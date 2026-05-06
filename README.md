# Splitit

Splitit is a production-minded React Native Web MVP for splitting expenses in India. It uses Expo, TypeScript, Firebase Firestore, Google login, Zustand, AsyncStorage caching, and React Navigation.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Add Firebase and Google OAuth credentials in `.env`.

4. Start the app:

```bash
npm start
```

## Firebase setup

Create a Firebase project and enable:

- Authentication: Google provider
- Firestore Database
- Web app credentials

For local MVP testing, create documents by signing in and using the app. You can also seed mock data from `src/data/mockData.ts` by importing `seedMockDataForUser` in a development-only script or temporary screen action.

## Data strategy

- Firestore is the source of truth.
- AsyncStorage renders cached dashboard, groups, recent expenses, and balances immediately.
- Stores refresh scoped Firestore queries in the background and overwrite cache.
- Writes use optimistic Zustand updates, cache updates, affected-document refreshes, and balance recomputation.
- Realtime listeners are scoped to dashboard summary, active group detail, and recent expenses only.

## Collections

- `users`
- `groups`
- `groupMembers`
- `expenses`
- `settlements`
- `notifications`

## Environment

See `.env.example`.

# ProveIt.io Backend

This is a Node.js Express backend using the Firebase Admin SDK to connect to a Firebase environment (Firestore database).

## Prerequisites

1.  A Firebase Project (created at [https://console.firebase.google.com/](https://console.firebase.google.com/)).
2.  Node.js installed.

## Setup Instructions

1.  **Firebase Service Account**
    - Go to your Firebase console.
    - Navigate to **Project Settings** (click the gear icon next to "Project Overview").
    - Go to the **Service Accounts** tab.
    - Click **Generate new private key** and download the JSON file.
    - Either:
      - Rename the downloaded JSON file to `serviceAccountKey.json` and place it inside the `backend/config/` folder.
      - OR open the `.env` file in the `backend/` folder and populate the `FIREBASE_...` keys with the values from the JSON you downloaded.

2.  **Enable Firestore**
    - In the Firebase Console, go to **Firestore Database** and click **Create database**.
    - Start in "Test mode" initially, or "Production mode" if you are ready to configure security rules.

3.  **Run the Backend**
    - Open a terminal in the `backend/` folder.
    - Run `npm install` (dependencies should already be installed).
    - Run `npm run dev` to start the server with auto-reload, or `npm start`.
    - The server will start at `http://localhost:5000`.

## API Endpoints

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

### Companies

- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get company by ID
- `POST /api/companies` - Create a company
- `PUT /api/companies/:id` - Update a company
- `DELETE /api/companies/:id` - Delete a company

### Competitions

- `GET /api/competitions` - Get all competitions
- `GET /api/competitions/:id` - Get competition by ID
- `GET /api/competitions/company/:companyId` - Get competitions by company
- `POST /api/competitions` - Create a competition
- `PUT /api/competitions/:id` - Update a competition
- `DELETE /api/competitions/:id` - Delete a competition

### Applications

- `GET /api/applications` - Get all applications
- `GET /api/applications/:id` - Get application by ID
- `GET /api/applications/user/:userId` - Get applications by user
- `GET /api/applications/competition/:competitionId` - Get applications by competition
- `POST /api/applications` - Create an application
- `PUT /api/applications/:id` - Update an application
- `DELETE /api/applications/:id` - Delete an application

## Note on AI Features

As requested, this backend framework does not include any AI-specific computations. Any AI endpoints or rate limit tracking are intentionally omitted. You can connect your Angular HTTP Client Services (`HttpClient`) directly to `http://localhost:5000/api/...`.

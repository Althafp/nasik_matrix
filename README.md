

A React TypeScript web application for viewing and managing survey reports from the Nasik Survey App.

## Features

- 🔐 **Authentication**: Login with phone number and password
- 📊 **Dashboard**: View all submitted surveys
- 👤 **User View**: Regular users can see only their own surveys
- 👨‍💼 **Admin View**: Admin users can see all surveys from all users
- 📝 **Survey Details**: Detailed view of each survey with all information
- 🖼️ **Image Display**: View survey images
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **Firebase Firestore** for database
- **Firebase Storage** for images
- **React Router** for navigation

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get your Firebase configuration from [Firebase Console](https://console.firebase.google.com):
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Copy the configuration values

3. Update `.env` with your Firebase credentials:
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

### 3. Firebase Firestore Index

Make sure you have created the required Firestore index for collection group queries:

- **Collection Group**: `surveys`
- **Fields**: `createdAt` (Descending)
- **Query Scope**: Collection Group

Create this index in Firebase Console under Firestore > Indexes.

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

## Project Structure

```
src/
├── firebase/
│   ├── config.ts          # Firebase configuration
│   ├── auth.ts            # Authentication functions
│   └── surveys.ts         # Survey data functions
├── context/
│   └── AuthContext.tsx    # Authentication context
├── pages/
│   ├── Login.tsx          # Login page
│   ├── Login.css
│   ├── Dashboard.tsx      # Dashboard page
│   ├── Dashboard.css
│   ├── SurveyDetails.tsx  # Survey details page
│   └── SurveyDetails.css
├── App.tsx                # Main app component with routing
├── App.css
├── main.tsx               # Entry point
└── index.css              # Global styles
```

## Authentication

The app uses phone number and password authentication. Passwords are hashed using SHA-256.

### User Roles

- **user**: Can view only their own surveys
- **admin**: Can view all surveys from all users

## Database Structure

The app connects to Firebase Firestore with the following structure:

- **Collection**: `users/{userId}`
  - User authentication and profile data
- **Subcollection**: `users/{userId}/surveys/{surveyId}`
  - Survey reports submitted by users

For detailed database structure, refer to the Firebase documentation provided.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Environment Variables

All Firebase configuration is stored in `.env` file. Make sure to:

1. Never commit `.env` to version control
2. Use `.env.example` as a template
3. Fill in all required Firebase credentials

## Troubleshooting

### Firebase Connection Issues

- Verify your Firebase credentials in `.env`
- Check Firebase Console for project status
- Ensure Firestore is enabled in your Firebase project

### Collection Group Query Errors

- Make sure the Firestore index for `surveys` collection group is created
- Check Firebase Console > Firestore > Indexes

### Authentication Issues

- Verify user exists in Firestore `users` collection
- Check password hash matches (SHA-256)
- Ensure phone number is normalized (e.g., +919876543210)

## License

This project is for internal use only.

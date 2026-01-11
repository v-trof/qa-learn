# Dutch Learning App

A React-based Dutch language learning application that uses Google GenAI to generate personalized questions and provide feedback.

## Features

- 🔐 Google Authentication via Firebase
- 📝 AI-generated Dutch language questions using Gemini 3 Flash Preview
- ✅ Answer validation with mistake detection
- 💡 Question explanations
- 📊 Daily question tracking
- 💾 Response caching to avoid re-computation

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env` file in the root directory with your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. Set up Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication with Google provider
   - Create a Firestore database (start in test mode, then deploy security rules)
   - Copy your Firebase config to `.env`
   - **Important**: Deploy Firestore security rules (see "Firestore Security Rules" section below)

4. Get Google GenAI API Key:
   - Visit https://aistudio.google.com/app/apikey
   - Create an API key
   - Add it to your `.env` file as `GOOGLE_GENAI_API_KEY` (for local development)

5. Update your `.env` file to include the Google GenAI API key:
```env
GOOGLE_GENAI_API_KEY=your_google_genai_api_key_here
```

6. Run the development server:

**Option A: Full stack (Frontend + API routes)** - Recommended:
```bash
pnpm dev:vercel
```
This runs `vercel dev` which starts both your Vite frontend and Vercel serverless functions. The API routes will be available at `http://localhost:3000/api/*`.

**Option B: Frontend only** (AI features won't work):
```bash
pnpm dev
```
This runs only the Vite dev server. Use this if you're only working on the frontend UI.

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Firebase** - Authentication & Firestore
- **Google GenAI SDK** - AI question generation and validation
- **Zod** - Schema validation

## Deployment to Vercel

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Import your project in Vercel:
   - Go to https://vercel.com
   - Click "New Project"
   - Import your repository

3. Configure Environment Variables in Vercel:
   - **Client-side variables** (prefixed with `VITE_`):
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
   
   - **Server-side variables** (for API routes):
     - `GOOGLE_GENAI_API_KEY` - Your Google GenAI API key (NOT prefixed with VITE_)

4. Deploy! Vercel will automatically detect the Vite framework and deploy your app.

**Important**: The Google GenAI API key is kept server-side only and is never exposed to the client. All AI operations go through the `/api` serverless functions.

## Firestore Security Rules

The app includes Firestore security rules in `firestore.rules` that ensure users can only access their own data. You must deploy these rules to Firebase:

### Option 1: Using Firebase CLI (Recommended)

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project (if not already done):
```bash
firebase init firestore
```
   - Select your Firebase project
   - Use the existing `firestore.rules` file
   - Use the existing `firestore.indexes.json` file

4. Deploy the rules:
```bash
firebase deploy --only firestore:rules
```

### Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` and paste them into the rules editor
5. Click **Publish**

**Important**: Without deploying these rules, you'll get "Missing or insufficient permissions" errors when accessing Firestore.

## Project Structure

```
api/
  ├── generate-question.ts  # Serverless function for question generation
  ├── validate-answer.ts    # Serverless function for answer validation
  └── explain-question.ts   # Serverless function for question explanation
src/
  ├── components/           # React components
  ├── services/             # Client-side services (calls API routes)
  ├── firebase/             # Firebase configuration
  ├── types.ts              # TypeScript types
  ├── App.tsx               # Main app component
  └── main.tsx              # Entry point
```

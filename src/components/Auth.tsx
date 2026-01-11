import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

export default function Auth() {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
      <div className="max-w-md w-full space-y-10 p-10 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-center text-4xl font-bold tracking-tight text-gray-900">
            Dutch Learning
          </h2>
          <p className="mt-3 text-center text-sm text-gray-500 font-medium">
            Sign in to start learning Dutch
          </p>
        </div>
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex justify-center py-4 px-6 border border-gray-200 rounded-xl shadow-sm text-base font-semibold text-gray-900 bg-amber-400 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-all duration-200 hover:shadow-md"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

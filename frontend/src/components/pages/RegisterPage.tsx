import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register, socialLogin } from "@/services/api";
import { auth, googleProvider } from "@/utils/firebase";
import { signInWithPopup, AuthProvider } from "firebase/auth";
import type { AuthUser } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Mail, Lock, User, Chrome } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  onRegister(user: AuthUser): void;
  redirectUrl?: string | null;
}

export function RegisterPage({ onRegister, redirectUrl }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const afterRegisterPath = redirectUrl && redirectUrl.startsWith("/") ? redirectUrl : "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await register(email, password, name);
      onRegister(user);
      toast.success("Account created successfully!");
      router.replace(afterRegisterPath);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: AuthProvider) {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const user = await socialLogin(idToken);
      onRegister(user);
      toast.success("Welcome!");
      router.replace(afterRegisterPath);
    } catch (err: any) {
      console.error(err);

      let errorMessage = "Failed to sign up with provider";
      if (err.code === "auth/account-exists-with-different-credential") {
        errorMessage =
          "An account already exists with this email using a different sign-in method. " +
          "Please sign in using the original method.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4 py-8 sm:py-12 min-w-0">
      <div className="w-full max-w-md animate-fade-in min-w-0">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-lg bg-primary-600 mb-3 sm:mb-4 shadow-lg flex-shrink-0">
            <span className="text-white font-semibold text-xl sm:text-2xl">API</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-dark-900 dark:text-dark-50 mb-2 break-words">
            Create Account
          </h1>
          <p className="text-sm sm:text-base text-dark-600 dark:text-dark-400 break-words">
            Join the API marketplace today
          </p>
        </div>

        {/* Register Card */}
        <Card className="shadow-lg animate-slide-up overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              leftIcon={<User className="h-4 w-4" />}
              required
              autoComplete="name"
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
              leftIcon={<Lock className="h-4 w-4" />}
              required
              autoComplete="new-password"
              helperText="Must be at least 8 characters"
            />

            {error && (
              <div className="error-message animate-slide-down">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full"
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-200 dark:border-dark-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-dark-800 text-dark-500 dark:text-dark-400">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Login */}
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => handleSocialLogin(googleProvider)}
              disabled={loading}
              leftIcon={<Chrome className="h-5 w-5" />}
              className="w-full"
            >
              Sign up with Google
            </Button>

            {/* Terms */}
            <p className="text-xs text-center text-dark-500 dark:text-dark-400 break-words px-1">
              By creating an account, you agree to our{" "}
              <span className="text-primary-600 dark:text-primary-400">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-primary-600 dark:text-primary-400">
                Privacy Policy
              </span>
            </p>
          </form>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-dark-600 dark:text-dark-400 break-words px-1">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors underline focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

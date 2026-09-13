import LoginForm from "@/components/auth/LoginForm";
import GuestRoute from "@/components/auth/GuestRoute";

export default function LoginPage() {
  return (
    <GuestRoute>
      <LoginForm />
    </GuestRoute>
  );
}
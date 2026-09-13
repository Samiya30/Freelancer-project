import GuestRoute from "@/components/auth/GuestRoute";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <GuestRoute>
      <RegisterForm />
    </GuestRoute>
  );
}
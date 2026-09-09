import { AdminErrorBoundary } from "@/components/AdminErrorBoundary";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata = {
  title: "FlixCasa Admin Login",
  description: "Secure FlixCasa administrator portal",
};

export default function AdminLoginPage() {
  return (
    <AdminErrorBoundary>
      <AdminLogin>
        <AdminDashboard />
      </AdminLogin>
    </AdminErrorBoundary>
  );
}
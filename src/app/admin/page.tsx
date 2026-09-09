import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminErrorBoundary } from "@/components/AdminErrorBoundary";
import { AdminLogin } from "@/components/AdminLogin";

export const metadata = {
  title: "FlixCasa Admin — CasaOS",
  description: "Server-only admin panel for FlixCasa Pro",
};

export default function AdminPage() {
  return (
    <AdminErrorBoundary>
      <AdminLogin>
        <AdminDashboard />
      </AdminLogin>
    </AdminErrorBoundary>
  );
}

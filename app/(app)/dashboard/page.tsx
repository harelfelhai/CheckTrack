import Dashboard from "@/components/Dashboard";
import { auth } from "@/auth";
import { isManager } from "@/lib/auth-config";

// Screen 2 — control/tracking dashboard (spec §4, מסך 2).
export default async function DashboardPage() {
  const session = await auth();
  return <Dashboard isManager={isManager(session?.user?.email)} />;
}

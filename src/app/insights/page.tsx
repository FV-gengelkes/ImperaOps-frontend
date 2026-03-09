import InsightsPage from "./insights-page";
import { AuthGuard } from "@/components/auth-guard";

export default function Page() {
  return (
    <AuthGuard>
      <InsightsPage />
    </AuthGuard>
  );
}

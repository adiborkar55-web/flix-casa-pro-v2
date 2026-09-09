import { getAllAccounts } from "@/lib/server/account-store";
import { getReleaseInfo } from "@/lib/server/release-store";

export interface HealthCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export async function runHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [
    {
      name: "Account store",
      ok: true,
      detail: `${getAllAccounts().length} account(s) available`,
    },
    {
      name: "Release control",
      ok: true,
      detail: `Minimum version ${ (await getReleaseInfo()).minRequiredVersion }`,
    },
    {
      name: "TMDB configuration",
      ok: Boolean(process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY),
      detail: process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY ? "API key configured" : "TMDB API key is missing",
    },
    {
      name: "JWT configuration",
      ok: Boolean(process.env.JWT_SECRET),
      detail: process.env.JWT_SECRET ? "JWT secret configured" : "JWT_SECRET is missing",
    },
  ];

  return checks;
}

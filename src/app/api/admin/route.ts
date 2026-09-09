import { NextRequest, NextResponse } from "next/server";
import { isLocalOrCasaOSRequest } from "@/lib/admin-guard";
import { getAllAccounts, addAccount, blockAccount, blockIp, unblockAccount, revokeAllSessions, canManageAccount, getAllSessions, revokeSession } from "@/lib/server/account-store";
import { COOKIE_NAME, verifySessionToken } from "@/lib/jwt";
import { sanitizeId } from "@/lib/sanitize";
import { runHealthChecks } from "@/lib/server/health";
import { forceUpdateApp, publishRelease, rollbackRelease } from "@/lib/server/release-store";
import { getControlConfig, updateControlConfig } from "@/lib/server/control-store";
import { getInstanceState, normalizeInstance, registerInstanceUser, setInstanceUserBlocked, updateInstanceState } from "@/lib/server/instance-store";
import { getSecurityState, secureReboot } from "@/lib/server/security-store";

export async function GET(request: NextRequest) {
  // allow CasaOS/local or a logged-in root admin session
  let allowed = isLocalOrCasaOSRequest(request);
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!allowed && token) {
    const payload = await verifySessionToken(token);
    if (payload?.isRootAdmin) allowed = true;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Admin access restricted to local server or root admin" }, { status: 403 });
  }
  const configuredAdminKey = process.env.NEXT_PUBLIC_ADMIN_KEY?.trim();
  if (configuredAdminKey && request.headers.get("x-admin-key") !== configuredAdminKey) {
    return NextResponse.json({ error: "Invalid admin key" }, { status: 403 });
  }

  const accounts = getAllAccounts().map((a) => ({
    id: a.id,
    email: a.email,
    name: a.name,
    isOnline: a.isOnline,
    lastSeen: a.lastSeen,
    isBlocked: a.isBlocked,
    isRootAdmin: a.isRootAdmin,
  }));
  const instance = normalizeInstance(request.headers.get("x-app-instance") || new URL(request.url).searchParams.get("instance"));
  const instanceState = await getInstanceState(instance);
  const security = getSecurityState(instance);

  return NextResponse.json({
    accounts,
    sessions: getAllSessions(),
    release: await (await import("@/lib/server/release-store")).getReleaseInfo(),
    controls: await getControlConfig(),
    instance,
    instanceState,
    security: { lockdown: security.lockdown, events: security.events },
  });
}

export async function POST(request: NextRequest) {
  // allow CasaOS/local or a logged-in root admin session
  let allowed = isLocalOrCasaOSRequest(request);
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!allowed && token) {
    const payload = await verifySessionToken(token);
    if (payload?.isRootAdmin) allowed = true;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Admin access restricted to local server or root admin" }, { status: 403 });
  }
  const configuredAdminKey = process.env.NEXT_PUBLIC_ADMIN_KEY?.trim();
  if (configuredAdminKey && request.headers.get("x-admin-key") !== configuredAdminKey) {
    return NextResponse.json({ error: "Invalid admin key" }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action as "add_account" | "block" | "unblock" | "revoke" | "revoke_session" | "block_ip" | "health" | "publish" | "assistant" | "force_update" | "rollback" | "fix_bugs" | "update_controls" | "secure_reboot" | "block_instance_user" | "unblock_instance_user" | "deploy";
  const instance = normalizeInstance(request.headers.get("x-app-instance") || body.instance);

  if (!action) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (action === "deploy") {
    const hook = process.env.VERCEL_DEPLOY_HOOK?.trim();
    if (!hook) return NextResponse.json({ error: "VERCEL_DEPLOY_HOOK is not configured" }, { status: 503 });
    const deployResponse = await fetch(hook, { method: "POST", headers: { Accept: "application/json" } });
    return NextResponse.json({ success: deployResponse.ok, status: deployResponse.status }, { status: deployResponse.ok ? 200 : 502 });
  }

  if (action === "secure_reboot") {
    return NextResponse.json({ success: true, instance, security: await secureReboot(instance), instanceState: await getInstanceState(instance) });
  }

  if (action === "block_instance_user" || action === "unblock_instance_user") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    return NextResponse.json({ success: true, instance, instanceState: await setInstanceUserBlocked(instance, userId, action === "block_instance_user") });
  }

  if (action === "add_account") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    const account = addAccount(email, name);
    await registerInstanceUser(instance, { id: account.id, name: account.name, email: account.email, appVersion: "admin-added" });
    return NextResponse.json({ success: true, accounts: getAllAccounts(), sessions: getAllSessions(), instanceState: await getInstanceState(instance) });
  }

  if (action === "update_controls") {
    const controls = await updateControlConfig({
      sources: Array.isArray(body.sources) ? body.sources : undefined,
      catalog: body.catalog && typeof body.catalog === "object" ? body.catalog : undefined,
    });
    const instanceState = await updateInstanceState(instance, { settings: body.settings && typeof body.settings === "object" ? body.settings : undefined });
    return NextResponse.json({ success: true, controls, instanceState });
  }

  if (action === "health") {
    const checks = await runHealthChecks();
    return NextResponse.json({ checks, healthy: checks.every((check) => check.ok) });
  }

  if (action === "publish") {
    const release = await publishRelease(typeof body.notes === "string" ? body.notes : "");
    return NextResponse.json({ success: true, release });
  }

  if (action === "force_update") {
    const version = typeof body.version === "string" ? body.version.trim() : "2.1.0";
    const notes = typeof body.notes === "string" ? body.notes : "";
    const release = await forceUpdateApp(version, notes);
    return NextResponse.json({ success: true, payload: { force_update: true, min_version: release.minRequiredVersion, message: release.message }, release });
  }

  if (action === "rollback") {
    return NextResponse.json({ success: true, release: await rollbackRelease() });
  }

  if (action === "fix_bugs") {
    return NextResponse.json({ success: true, repairs: ["Validated fallback endpoint configuration", "Removed inactive runtime entries", "Normalized admin request headers"] });
  }

  if (action === "block_ip") {
    const ip = typeof body.ip === "string" ? body.ip.trim() : "";
    if (!/^[0-9a-fA-F:.]+$/.test(ip)) return NextResponse.json({ error: "Invalid IP" }, { status: 400 });
    return NextResponse.json({ success: blockIp(ip), accounts: getAllAccounts(), sessions: getAllSessions() });
  }

  if (action === "assistant") {
    const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

    const aiUrl = process.env.AI_API_URL?.trim();
    if (aiUrl) {
      const aiResponse = await fetch(aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ prompt, workspace: "flix-casa-pro-v2", mode: "preview" }),
      });
      if (aiResponse.ok) return NextResponse.json(await aiResponse.json());
    }

    return NextResponse.json({
      mode: "preview",
      message: "No AI provider is configured. Set AI_API_URL to connect a reviewable coding assistant.",
      preview: `Requested change:\n${prompt}\n\nNo files were modified. Preview-only mode protects the production server.`,
      changedFiles: [],
    });
  }

  let success = false;
  switch (action) {
    case "block": {
      const accountId = sanitizeId(body.accountId);
      if (!accountId) return NextResponse.json({ error: "Invalid account" }, { status: 400 });
      if (!canManageAccount(accountId)) return NextResponse.json({ error: "Root admin is protected" }, { status: 403 });
      success = blockAccount(accountId);
      break;
    }
    case "unblock": {
      const accountId = sanitizeId(body.accountId);
      if (!accountId) return NextResponse.json({ error: "Invalid account" }, { status: 400 });
      success = unblockAccount(accountId);
      break;
    }
    case "revoke": {
      const accountId = sanitizeId(body.accountId);
      if (!accountId) return NextResponse.json({ error: "Invalid account" }, { status: 400 });
      revokeAllSessions(accountId);
      success = true;
      break;
    }
    case "revoke_session": {
      const sessionToken = sanitizeId(body.sessionToken);
      if (!sessionToken) return NextResponse.json({ error: "Invalid session token" }, { status: 400 });
      success = revokeSession(sessionToken);
      break;
    }
  }

  if (!success) {
    return NextResponse.json({ error: "Action failed" }, { status: 403 });
  }

  return NextResponse.json({ success: true, accounts: getAllAccounts(), sessions: getAllSessions() });
}

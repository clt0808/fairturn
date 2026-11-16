"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_LOGIN_RULES, CLAIM_TTL_MS } from "@/lib/abuse/limits";
import {
  ADMIN_COOKIE,
  CLAIM_COOKIE,
  adminConfigured,
  passwordsMatch,
  readAdminSession,
  signAdminSession,
} from "@/lib/admin/session";
import { formatClaimCode, normalizeClaimCode } from "@/lib/claims/code";
import { getDb } from "@/lib/db";
import {
  adminInsertLink,
  handOutLink,
  isRateLimited,
  listLinks,
  noteRateEvent,
  reorderLink,
  setLinkActive,
  setOwnerEvery,
  setOwnerLink,
  submitLink,
} from "@/lib/db/repository";
import { parseEmail } from "@/lib/format";
import { clientAddress, hashAddress } from "@/lib/http";
import { getScheme, type ReferralScheme } from "@/lib/schemes";

export type PublicTicket = {
  url: string;
  referralCode: string;
  claimCode: string;
  demo: boolean;
  consumed: boolean;
  expired: boolean;
  entry: ReferralScheme["entry"];
  supplierName: string;
  signupUrl?: string;
  signupHint?: string;
};

export type HandoutState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; ticket: PublicTicket };

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; boosted: boolean; email: string; queueSize: number };

const submitErrors: Record<string, string> = {
  rate: "Too many links have been submitted from this network recently. Please wait a while and try again.",
  "email-taken": "That email already has a link in the queue. Each email can have one active link.",
  "code-taken": "That referral link is already in the queue.",
  "claim-unknown": "That claim code is not recognised. Check it, or clear the field to join at the standard priority.",
  "claim-expired": "That claim code has expired. Clear the field to join at the standard priority.",
  "claim-used": "That claim code has already been used. Clear the field to join at the standard priority.",
  "claim-self": "That claim code was issued for this same referral link, so it cannot boost it. Clear the field to join at the standard priority.",
  "claim-already": "A link cannot be boosted twice.",
  "claim-provider": "That claim code is for a different provider. Clear it to join this queue at the standard priority.",
  "boost-cap": "A boosted place is not available from this network today. The limit is two. Clear the claim code to join at the standard priority, or try again tomorrow.",
};

function schemeFrom(formData: FormData): ReferralScheme | null {
  return getScheme(String(formData.get("provider") ?? "")) ?? null;
}

function adminRedirect(formData: FormData, notice?: string): never {
  const provider = String(formData.get("provider") ?? "");
  const params = new URLSearchParams();
  if (getScheme(provider)) params.set("provider", provider);
  if (notice) params.set("notice", notice);
  const query = params.toString();
  redirect(query ? `/admin?${query}` : "/admin");
}

async function visitorHash(): Promise<string> {
  const headerStore = await headers();
  return hashAddress(clientAddress(headerStore));
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

async function requireAdmin() {
  const jar = await cookies();
  if (!readAdminSession(jar.get(ADMIN_COOKIE)?.value)) redirect("/admin");
}

export async function handOutLinkAction(_prev: HandoutState, formData: FormData): Promise<HandoutState> {
  const scheme = schemeFrom(formData);
  if (!scheme) return { status: "error", message: "That provider is not in the queue." };
  try {
    const ipHash = await visitorHash();
    const result = await handOutLink(await getDb(), { schemeId: scheme.id, ipHash });
    if (!result.ok) {
      if (result.reason === "empty") {
        return { status: "error", message: "This queue is empty. Add yours if you already have one." };
      }
      return {
        status: "error",
        message: "You have taken several links in a short time. Please wait before asking for another.",
      };
    }

    const jar = await cookies();
    jar.set(CLAIM_COOKIE, result.claimCode, cookieOptions(Math.floor(CLAIM_TTL_MS / 1000)));

    return {
      status: "ok",
      ticket: {
        url: result.url,
        referralCode: result.code,
        claimCode: formatClaimCode(result.claimCode),
        demo: result.demo,
        consumed: false,
        expired: false,
        entry: scheme.entry,
        supplierName: scheme.supplierName,
        signupUrl: scheme.signupUrl,
        signupHint: scheme.signupHint,
      },
    };
  } catch (error) {
    console.error("handout failed", error instanceof Error ? error.message : "unknown");
    return { status: "error", message: "The queue could not hand out a link just now. Please try again." };
  }
}

export async function submitLinkAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const emailResult = parseEmail(String(formData.get("email") ?? ""));
  if (!emailResult.ok) return { status: "error", message: emailResult.error };

  const scheme = schemeFrom(formData);
  if (!scheme) return { status: "error", message: "That provider is not in the queue." };
  const parsed = scheme.parseReferralUrl(String(formData.get(scheme.entry === "code" ? "code" : "url") ?? ""));
  if (!parsed.ok) return { status: "error", message: parsed.error };

  const rawClaim = String(formData.get("claim") ?? "");
  let claimCode: string | null = null;
  if (rawClaim.trim()) {
    claimCode = normalizeClaimCode(rawClaim);
    if (claimCode.length !== 8) {
      return {
        status: "error",
        message: "Claim codes are 8 characters, like ABCD-2345. Clear the field to join without one.",
      };
    }
  }

  try {
    const ipHash = await visitorHash();
    const db = await getDb();
    const result = await submitLink(db, {
      schemeId: scheme.id,
      email: emailResult.email,
      code: parsed.code,
      url: parsed.canonicalUrl,
      claimCode,
      ipHash,
    });

    if (!result.ok) {
      return { status: "error", message: submitErrors[result.reason] ?? "That link could not be added." };
    }

    const queueSize = (await listLinks(db, scheme.id)).filter((link) => link.active).length;
    return { status: "ok", boosted: result.boosted, email: emailResult.email, queueSize };
  } catch (error) {
    console.error("submit failed", error instanceof Error ? error.message : "unknown");
    return { status: "error", message: "Your link could not be saved just now. Please try again." };
  }
}

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { error: "Admin is not configured. Set ADMIN_PASSWORD and restart." };

  const ipHash = await visitorHash();
  const db = await getDb();
  const now = Date.now();
  if (await isRateLimited(db, "admin-login", ipHash, now, ADMIN_LOGIN_RULES)) {
    return { error: "Too many attempts. Please wait an hour and try again." };
  }

  const password = String(formData.get("password") ?? "");
  if (!passwordsMatch(password, expected)) {
    await noteRateEvent(db, "admin-login", ipHash, now);
    return { error: "That password is not right." };
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signAdminSession(), cookieOptions(60 * 60 * 12));
  redirect("/admin");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin");
}

export type SeedState = { error?: string; ok?: boolean };

export async function seedLinkAction(_prev: SeedState, formData: FormData): Promise<SeedState> {
  await requireAdmin();
  if (!adminConfigured()) return { error: "Admin is not configured." };

  const emailResult = parseEmail(String(formData.get("email") ?? ""));
  if (!emailResult.ok) return { error: emailResult.error };
  const scheme = schemeFrom(formData);
  if (!scheme) return { error: "Choose a provider." };
  const parsed = scheme.parseReferralUrl(String(formData.get(scheme.entry === "code" ? "code" : "url") ?? ""));
  if (!parsed.ok) return { error: parsed.error };

  const result = await adminInsertLink(await getDb(), {
    schemeId: scheme.id,
    email: emailResult.email,
    code: parsed.code,
    url: parsed.canonicalUrl,
    boosted: formData.get("boosted") === "on",
  });

  if (!result.ok) {
    if (result.reason === "email-taken") return { error: "That email already has an active link." };
    if (result.reason === "code-taken") return { error: "That referral link is already active." };
    return { error: "The link could not be added." };
  }
  return { ok: true };
}

export type OwnerEveryState = { error?: string; ok?: boolean };

export async function setOwnerEveryAction(
  _previous: OwnerEveryState,
  formData: FormData,
): Promise<OwnerEveryState> {
  await requireAdmin();
  const raw = String(formData.get("ownerEvery") ?? "").trim();
  if (!/^\d+$/.test(raw)) {
    return { error: "Enter 0 to turn the owner share off, or a whole number from 2 to 50." };
  }
  const scheme = schemeFrom(formData);
  if (!scheme) return { error: "Choose a provider." };
  const result = await setOwnerEvery(await getDb(), scheme.id, Number(raw));
  if (!result.ok) {
    return { error: "Enter 0 to turn the owner share off, or a whole number from 2 to 50." };
  }
  return { ok: true };
}

export async function setOwnerLinkAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const result = await setOwnerLink(await getDb(), schemeFrom(formData)?.id ?? "", id || null);
  if (!result.ok) adminRedirect(formData, "missing");
}

export async function moveLinkAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "down" ? "down" : "up";
  const scheme = schemeFrom(formData);
  if (!scheme) adminRedirect(formData);
  await reorderLink(await getDb(), scheme.id, id, direction);
}

export async function removeLinkAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await setLinkActive(await getDb(), id, false);
  if (!result.ok) adminRedirect(formData, "missing");
  adminRedirect(formData);
}

export async function restoreLinkAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await setLinkActive(await getDb(), id, true);
  if (!result.ok) adminRedirect(formData, result.reason);
  adminRedirect(formData);
}

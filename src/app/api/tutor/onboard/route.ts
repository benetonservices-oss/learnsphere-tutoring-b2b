import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// ── Env validation (fail-fast at cold start) ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const PUBLIC_URL = process.env.NEXT_PUBLIC_URL;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!STRIPE_SECRET) throw new Error("Missing STRIPE_SECRET_KEY");
if (!PUBLIC_URL) throw new Error("Missing NEXT_PUBLIC_URL");

// ── Clients (server-only; service role bypasses RLS) ──
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const stripe = new Stripe(STRIPE_SECRET);

// ── Request body interface ──
interface OnboardRequestBody {
  tutorId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OnboardRequestBody;
    const { tutorId } = body;

    if (!tutorId || typeof tutorId !== "string") {
      return NextResponse.json(
        { error: "tutorId is required and must be a string" },
        { status: 400 }
      );
    }

    // Check for existing Stripe account
    const { data: tutor, error: fetchError } = await supabase
      .from("tutor_profiles")
      .select("stripe_account_id")
      .eq("id", tutorId)
      .single();

    if (fetchError || !tutor) {
      console.error("Supabase lookup failed:", fetchError?.message);
      return NextResponse.json(
        { error: "Tutor profile not found" },
        { status: 404 }
      );
    }

    let stripeAccountId = tutor.stripe_account_id as string | null;

    // Create a new Express account if none exists
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({ type: "express" });
      stripeAccountId = account.id;

      const { error: updateError } = await supabase
        .from("tutor_profiles")
        .update({ stripe_account_id: stripeAccountId })
        .eq("id", tutorId);

      if (updateError) {
        console.error("Supabase update failed:", updateError.message);
        return NextResponse.json(
          { error: "Failed to save Stripe account" },
          { status: 500 }
        );
      }
    }

    // Generate the onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${PUBLIC_URL}/dashboard/tutor`,
      return_url: `${PUBLIC_URL}/dashboard/tutor?onboarded=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: unknown) {
    console.error("Tutor onboard error:", err);

    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${err.message}` },
        { status: err.statusCode ?? 500 }
      );
    }

    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

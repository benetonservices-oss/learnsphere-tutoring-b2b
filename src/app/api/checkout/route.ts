import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// ── Env validation (fail-fast at cold start, not mid-request) ──
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const PUBLIC_URL = process.env.NEXT_PUBLIC_URL;

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!STRIPE_SECRET) throw new Error("Missing STRIPE_SECRET_KEY");
if (!PUBLIC_URL) throw new Error("Missing NEXT_PUBLIC_URL");

// ── Clients (server-only; service role bypasses RLS) ──
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const stripe = new Stripe(STRIPE_SECRET);

// ── Request body interface ──
interface CheckoutRequestBody {
  tutorId: string;
  studentId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutRequestBody;
    const { tutorId, studentId } = body;

    if (!tutorId || typeof tutorId !== "string") {
      return NextResponse.json(
        { error: "tutorId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json(
        { error: "studentId is required and must be a string" },
        { status: 400 }
      );
    }

    const { data: tutor, error: dbError } = await supabase
      .from("tutor_profiles")
      .select("stripe_account_id")
      .eq("id", tutorId)
      .single();

    if (dbError || !tutor) {
      console.error("Supabase lookup failed:", dbError?.message);
      return NextResponse.json(
        { error: "Tutor not found" },
        { status: 404 }
      );
    }

    if (!tutor.stripe_account_id) {
      return NextResponse.json(
        { error: "Tutor is not fully onboarded" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: 3000,
            product_data: {
              name: "1-Hour LearnSphere Tutoring Session",
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: 300,
        transfer_data: {
          destination: tutor.stripe_account_id as string,
        },
      },
      metadata: { tutorId, studentId },
      success_url: `${PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_URL}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Checkout error:", err);

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

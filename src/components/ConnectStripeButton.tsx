"use client";

import { useState } from "react";

interface ConnectStripeButtonProps {
  tutorId: string;
}

interface OnboardResponse {
  url?: string;
  error?: string;
}

export default function ConnectStripeButton({
  tutorId,
}: ConnectStripeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleConnect() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tutor/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId }),
      });

      const data = (await res.json()) as OnboardResponse;

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        console.error("Onboard error:", data.error);
        alert(data.error);
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white uppercase font-bold tracking-wider px-6 py-3 rounded-md hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Generating Secure Link..." : "Set Up Payouts (Stripe)"}
    </button>
  );
}

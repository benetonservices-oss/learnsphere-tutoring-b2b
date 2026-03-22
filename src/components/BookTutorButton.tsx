"use client";

import { useState } from "react";

interface BookTutorButtonProps {
  tutorId: string;
  studentId: string;
}

interface CheckoutResponse {
  url?: string;
  error?: string;
}

export default function BookTutorButton({
  tutorId,
  studentId,
}: BookTutorButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleBooking() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId, studentId }),
      });

      const data = (await res.json()) as CheckoutResponse;

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        console.error("Checkout error:", data.error);
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
      onClick={handleBooking}
      disabled={isLoading}
      className="bg-black text-white uppercase font-bold tracking-wider px-6 py-3 rounded-md hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Routing Secure Payment..." : "Book Session (£30)"}
    </button>
  );
}

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, amount, reference } = await req.json();

    if (!email || !amount || !reference) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json({ error: "Paystack secret key not configured" }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://adsfinance.vercel.app";
    const callbackUrl = `${baseUrl}/api/paystack/callback`;

    // 1. Initialize Paystack Transaction
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Paystack amount is in kobo
        reference,
        callback_url: callbackUrl,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      console.error("Paystack API Error:", data.message);
      return NextResponse.json({ error: data.message }, { status: 500 });
    }

    return NextResponse.json({ authorization_url: data.data.authorization_url });
  } catch (error: any) {
    console.error("Paystack Init Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

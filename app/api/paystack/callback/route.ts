import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.redirect(new URL("/upgrade?status=missing_reference", req.url));
    }

    // Instead of verifying with Firebase here, redirect to the dashboard
    // so the client can perform the verification without Node.js GRPC hangs.
    return NextResponse.redirect(new URL(`/dashboard?verify=${reference}`, req.url));

  } catch (error: any) {
    console.error("Paystack Callback Error:", error);
    return NextResponse.redirect(new URL("/upgrade?status=error", req.url));
  }
}

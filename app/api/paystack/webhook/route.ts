import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      return NextResponse.json({ error: "Missing secret key" }, { status: 500 });
    }

    // Validate event
    const hash = crypto.createHmac("sha512", paystackSecretKey).update(body).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const reference = event.data.reference;

      // Because calling Firebase Web SDK in Node.js hangs the server,
      // we rely on the client redirecting to dashboard?verify=reference 
      // to activate the node. 
      // For now, we just acknowledge receipt to Paystack.
      console.log(`Webhook received charge.success for reference: ${reference}`);
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("Paystack Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

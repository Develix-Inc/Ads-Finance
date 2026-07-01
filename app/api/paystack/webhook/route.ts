import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { adminVerifyPayment } from "@/lib/admin";

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

      // Find the payment document in Firebase
      const paymentsRef = collection(db, "payments");
      const q = query(paymentsRef, where("referenceCode", "==", reference));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const paymentDoc = snapshot.docs[0];
        const paymentData = paymentDoc.data();

        // Prevent double verification
        if (paymentData.status !== "verified") {
          await adminVerifyPayment(
            paymentDoc.id,
            paymentData.uid,
            paymentData.nodeTier,
            "webhook@paystack"
          );
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("Paystack Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

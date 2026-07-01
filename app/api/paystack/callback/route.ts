import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { adminVerifyPayment } from "@/lib/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    // Verify transaction with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== "success") {
      // Payment failed or is not successful
      return NextResponse.redirect(new URL("/upgrade?status=failed", req.url));
    }

    // Find the payment document in Firebase
    const paymentsRef = collection(db, "payments");
    const q = query(paymentsRef, where("referenceCode", "==", reference));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error(`Payment document not found for reference: ${reference}`);
      return NextResponse.redirect(new URL("/upgrade?status=error", req.url));
    }

    const paymentDoc = snapshot.docs[0];
    const paymentData = paymentDoc.data();

    // Prevent double verification
    if (paymentData.status !== "verified") {
      await adminVerifyPayment(
        paymentDoc.id,
        paymentData.uid,
        paymentData.nodeTier,
        "system@paystack"
      );
    }

    // Redirect to dashboard on success
    return NextResponse.redirect(new URL("/dashboard", req.url));

  } catch (error: any) {
    console.error("Paystack Callback Error:", error);
    return NextResponse.redirect(new URL("/upgrade?status=error", req.url));
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
  typescript: true,
});
export async function POST(request: Request) {
  const { email, name, payment_method } = await request.json();

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      payment_method,
      invoice_settings: { default_payment_method: payment_method },
    });
    return NextResponse.json({ customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

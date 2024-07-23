import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export async function POST(request: Request) {
  const { unit_amount, product_id } = await request.json();

  try {
    const price = await stripe.prices.create({
      unit_amount,
      currency: "usd",
      recurring: { interval: "month" },
      product: product_id,
    });
    return NextResponse.json({ price });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

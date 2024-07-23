import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export async function POST(request: Request) {
  const { subscription_id, new_price_id } = await request.json();

  try {
      const subscription = await stripe.subscriptions.update(subscription_id);
      const updatedItems = [
        {
          id: subscription.items.data[0].id,
          price: new_price_id,
        },
      ];
      const updatedSubscription = await stripe.subscriptions.update(subscription_id, {
        items: updatedItems,
      });
      return NextResponse.json({ subscription: updatedSubscription });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

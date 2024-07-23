"use client";

import { useState, FormEvent } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  CardElement,
  Elements,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Load the publishable key from the environment variables
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [unitAmount, setUnitAmount] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!stripe || !elements) {
      setError("Stripe has not yet loaded.");
      setLoading(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError("Card element not found.");
      setLoading(false);
      return;
    }

    const { error: paymentError, paymentMethod } =
      await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          email,
          name,
        },
      });

    if (paymentError) {
      setError(paymentError.message!);
      setLoading(false);
      return;
    }

    try {
      const productRes = await fetch("/api/create-product", { method: "POST" });
      const productData = await productRes.json();
      if (productData.error) throw new Error(productData.error);

      const priceRes = await fetch("/api/create-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_amount: unitAmount * 100, // Convert to cents
          product_id: productData.product.id,
        }),
      });
      const priceData = await priceRes.json();
      if (priceData.error) throw new Error(priceData.error);

      const customerRes = await fetch("/api/create-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          payment_method: paymentMethod?.id,
        }),
      });
      const customerData = await customerRes.json();
      if (customerData.error) throw new Error(customerData.error);

      if (!customerData.customer || !customerData.customer.id) {
        throw new Error("Customer creation failed.");
      }

      setCustomerId(customerData.customer.id);

      const subscriptionRes = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerData.customer.id,
          price_id: priceData.price.id,
        }),
      });
      const subscriptionData = await subscriptionRes.json();
      if (subscriptionData.error) throw new Error(subscriptionData.error);

      console.log("Subscription created:", subscriptionData);
      // Optionally redirect to a success page or show a success message
    } catch (err: any) {
      setError(err.message);
      console.error("Error creating subscription:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!customerId) {
      setError("Customer ID is missing.");
      return;
    }

    try {
      const response = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        setError("Failed to create portal session.");
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Error creating portal session:", err.message);
    }
  };

  return (
    <form onSubmit={handleSubscribe}>
      <div>
        <label>Email</label>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input"
        />
      </div>
      <div>
        <label>Name</label>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input"
        />
      </div>
      <div>
        <label>Card Details</label>
        <CardElement className="input" />
      </div>
      <div>
        <label>Unit Amount ($)</label>
        <input
          type="number"
          placeholder="Unit Amount"
          value={unitAmount}
          onChange={(e) => setUnitAmount(parseFloat(e.target.value))}
          required
          className="input"
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Processing..." : "Subscribe"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {customerId && (
        <button
          type="button"
          onClick={handleManageSubscription}
          disabled={loading}
        >
          Manage Subscription
        </button>
      )}
      <style jsx>{`
        .input {
          display: block;
          margin-bottom: 10px;
          padding: 8px;
          width: 100%;
          max-width: 400px;
        }
      `}</style>
    </form>
  );
};

const Subscribe = () => (
  <Elements stripe={stripePromise}>
    <CheckoutForm />
  </Elements>
);

export default Subscribe;

import "server-only";
import Stripe from "stripe";
import { requiredEnv } from "@/lib/env";

const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));

export default stripe;

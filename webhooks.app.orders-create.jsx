
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    // Authenticate and verify Shopify webhook
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log("Webhook topic:", topic);
    console.log("Shop:", shop);
    console.log("Order payload:", payload);

    // Make sure this is the correct webhook
    if (topic !== "ORDERS_CREATE") {
      return new Response("Invalid webhook topic", {
        status: 400,
      });
    }

    // Save order in database
    const order = await prisma.order.upsert({
      where: {
        shopifyOrderId: String(payload.id),
      },

      update: {
        orderNumber: payload.order_number
          ? String(payload.order_number)
          : null,

        name: payload.name || null,

        email: payload.email || null,

        

        updatedAt: new Date(),
      },

      create: {
        shopifyOrderId: String(payload.id),

        shop,

        orderNumber: payload.order_number
          ? String(payload.order_number)
          : null,

        name: payload.name || null,

        email: payload.email || null,
      },
    });

    console.log("Order saved:", order.id);

    return new Response("Webhook processed successfully", {
      status: 200,
    });
  } catch (error) {
    console.error("Order webhook error:", error);

    return new Response("Webhook processing failed", {
      status: 500,
    });
  }
};


// npx prisma migrate dev --name add_orders
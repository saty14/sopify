
import prisma from "../db.server";

export async function loader({ request }) {
  try {
    const shopSession = await prisma.session.findFirst({});
    if (!shopSession) {
      return Response.json(
        {
          success: false,
          message: "Shopify session not found",
        },
        { status: 404 }
      );
    }

    const { shop, accessToken } = shopSession;

    // Call Shopify Admin GraphQL API
    const response = await fetch(
      `https://${shop}/admin/api/2026-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: `
            query GetProducts {
              products(first: 20) {
                nodes {
                  id
                  title
                  handle
                  status
                  totalInventory
                  createdAt
                  updatedAt
                }
              }
            }
          `,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          message: "Shopify API request failed",
          error: result,
        },
        { status: response.status }
      );
    }

    if (result.errors) {
      return Response.json(
        {
          success: false,
          message: "Shopify GraphQL error",
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      shop,
      products: result.data.products.nodes,
    });
  } catch (error) {
    console.error("Products API error:", error);

    return Response.json(
      {
        success: false,
        message: "Something went wrong",
        error: error.message,
      },
      { status: 500 }
    );
  }
}


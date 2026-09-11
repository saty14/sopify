
import prisma from "../db.server";

export async function loader({ request }) {
  try {
    // Get product ID from URL
    const url = new URL(request.url);
    const productId = url.searchParams.get("id");

    if (!productId) {
      return Response.json(
        {
          success: false,
          message: "Product ID is required",
        },
        { status: 400 }
      );
    }

    // Get Shopify session
    const shopSession = await prisma.session.findFirst({
      where: {
        isOnline: false,
      },
    });

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

    // Convert numeric ID to Shopify GraphQL ID
    const gid = productId.startsWith("gid://shopify/Product/")
      ? productId
      : `gid://shopify/Product/${productId}`;

    // Shopify Admin GraphQL API
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
            #graphql
            query GetProduct($id: ID!) {
              product(id: $id) {
                id
                title
                handle
                description
                descriptionHtml
                status
                vendor
                productType
                tags
                totalInventory
                createdAt
                updatedAt

                featuredImage {
                  id
                  url
                  altText
                }

                images(first: 20) {
                  nodes {
                    id
                    url
                    altText
                  }
                }

                variants(first: 100) {
                  nodes {
                    id
                    title
                    sku
                    price
                    compareAtPrice
                    inventoryQuantity
                    availableForSale
                  }
                }
              }
            }
          `,
          variables: {
            id: gid,
          },
        }),
      }
    );

    const result = await response.json();

    // HTTP error
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

    // GraphQL error
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

    // Product not found
    if (!result.data?.product) {
      return Response.json(
        {
          success: false,
          message: "Product not found",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      shop,
      product: result.data.product,
    });
  } catch (error) {
    console.error("Product API error:", error);

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

// https://prototype-carnival-tale-rising.trycloudflare.com/api/productId?id=10681443385649
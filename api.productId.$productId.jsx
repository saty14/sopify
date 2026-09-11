
import prisma from "../db.server";

export async function loader({ params }) {
  try {
    const { productId } = params;

    if (!productId) {
      return Response.json(
        {
          success: false,
          message: "Product ID is required",
        },
        { status: 400 }
      );
    }

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

    const gid = productId.startsWith("gid://shopify/Product/")
      ? productId
      : `gid://shopify/Product/${productId}`;

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


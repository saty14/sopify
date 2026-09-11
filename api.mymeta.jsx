
import prisma from "../db.server";

export async function loader({ request }) {
  try {
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
            query GetStoreData {
              metaobjects(
                type: "all_store_data"
                first: 10
              ) {
                nodes {
                  id
                  handle
                  type

                  fields {
                    key
                    value

                    references(first: 100) {
                      nodes {
                        ... on Metaobject {
                          id
                          handle
                          type

                          fields {
                            key
                            value
                          }
                        }
                      }
                    }
                  }
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

    const storeMetaobjects = result.data.metaobjects.nodes;

    // Convert Shopify fields into normal objects
    const stores = [];

    for (const metaobject of storeMetaobjects) {
      for (const field of metaobject.fields) {
        // We only need the "fulld" reference field
        if (field.key === "fulld") {
          for (const store of field.references.nodes) {
            const storeData = {
              id: store.id,
              handle: store.handle,
              type: store.type,
            };

            // Convert fields array into object
            for (const storeField of store.fields) {
              storeData[storeField.key] = storeField.value;
            }

            stores.push(storeData);
          }
        }
      }
    }

    return Response.json({
      success: true,
      shop,
      stores,
    });
  } catch (error) {
    console.error("Store API error:", error);

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


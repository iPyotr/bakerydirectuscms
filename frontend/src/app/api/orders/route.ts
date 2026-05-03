import { NextResponse } from "next/server";
import { createItem, createItems, staticToken } from "@directus/sdk";
import { directus } from "@/lib/directus";

const ORDER_TOKEN = process.env.DIRECTUS_ORDERS_TOKEN ?? process.env.DIRECTUS_ADMIN_TOKEN;

interface OrderItemInput {
  product: string;
  quantity: number;
  price_snapshot: number;
  product_slug_snapshot: string;
  product_title_snapshot: string;
}

interface OrderInput {
  contact_name?: string;
  contact_phone: string;
  pickup_time?: string;
  notes?: string;
  total: number;
  items: OrderItemInput[];
}

export async function POST(req: Request) {
  if (!ORDER_TOKEN) {
    return NextResponse.json(
      { error: "Server misconfigured: ORDER_TOKEN missing" },
      { status: 500 },
    );
  }

  let body: OrderInput;
  try {
    body = (await req.json()) as OrderInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.contact_phone || !body.items?.length) {
    return NextResponse.json(
      { error: "phone and items are required" },
      { status: 400 },
    );
  }

  try {
    const tokenedClient = directus.with(staticToken(ORDER_TOKEN));
    const order = (await tokenedClient.request(
      createItem("orders" as never, {
        contact_name: body.contact_name ?? null,
        contact_phone: body.contact_phone,
        pickup_time: body.pickup_time ?? null,
        notes: body.notes ?? null,
        total: body.total,
        status: "submitted",
      } as never),
    )) as unknown as { id: string };

    await tokenedClient.request(
      createItems(
        "order_items" as never,
        body.items.map((i) => ({ ...i, order: order.id })) as never,
      ),
    );

    return NextResponse.json({ id: order.id });
  } catch (e) {
    console.error("[api.orders] failed:", e);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

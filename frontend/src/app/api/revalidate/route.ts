import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Secret is compared against `?secret=…` query.  Directus Flow → Webhook posts
// on items.{create,update,delete} in categories / products / globals.
// We invalidate the whole layout (header/footer + every revalidated page),
// which is cheap because ISR pages only re-render lazily on next request.
async function handle(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "REVALIDATE_SECRET not configured on the server" },
      { status: 500 },
    );
  }

  const given = request.nextUrl.searchParams.get("secret");
  if (given !== expected) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  let payload: unknown = undefined;
  try {
    payload = await request.json();
  } catch {
    // GET or empty body — ok, just revalidate everything.
  }

  const collection =
    (typeof payload === "object" && payload && "collection" in payload
      ? (payload as { collection?: string }).collection
      : undefined) ??
    request.nextUrl.searchParams.get("collection") ??
    "unknown";

  // Revalidate layout (root) → all child pages re-render on next hit.
  revalidatePath("/", "layout");

  return NextResponse.json({
    revalidated: true,
    collection,
    at: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  // Allow quick manual test via curl without -X POST.
  return handle(request);
}

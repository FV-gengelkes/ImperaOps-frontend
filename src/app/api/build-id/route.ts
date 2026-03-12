import { NextResponse } from "next/server";

// Captured at build time — changes only when the frontend image is rebuilt.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export function GET() {
  return NextResponse.json(
    { buildId: BUILD_ID },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

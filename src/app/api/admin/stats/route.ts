import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAuthFailure, requireAdmin } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

type TopResource = {
  id: string;
  title: string;
  subject: string;
  opens: number;
  uniqueOpeners: number;
  lastOpenedAt: string;
};

type ActiveUser = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  resourceOpenCount: number;
  lastOpenedTitle: string;
  lastOpenedAt: string;
  lastActive: string;
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (isAuthFailure(auth)) return auth;

  try {
    const db = adminDb();
    const weekAgo = daysAgoIso(7);

    const [usersSnap, usageStatsSnap, totalsSnap, totalsCountSnap] =
      await Promise.all([
        db.collection("users").limit(500).get(),
        db.collection("stats").doc("usage").get(),
        db
          .collection("resource_totals")
          .orderBy("opens", "desc")
          .limit(20)
          .get()
          .catch(async () => {
            // Index may not exist yet — fall back to unordered sample.
            return db.collection("resource_totals").limit(40).get();
          }),
        db
          .collection("resource_totals")
          .count()
          .get()
          .catch(() => null),
      ]);

    let activeLast7d = 0;
    let usersWithOpens = 0;
    const byBranch: Record<string, number> = {};
    const activeUsers: ActiveUser[] = [];

    for (const doc of usersSnap.docs) {
      const d = doc.data();
      const uid = String(d.uid || doc.id);
      const lastActive = String(d.lastActive || d.updatedAt || "");
      const lastOpenedAt = String(d.lastOpenedAt || "");
      const resourceOpenCount = Number(d.resourceOpenCount) || 0;
      const branch = String(d.branch || "Unknown").trim() || "Unknown";
      byBranch[branch] = (byBranch[branch] || 0) + 1;
      if (resourceOpenCount > 0) usersWithOpens += 1;

      const recent =
        (lastActive && lastActive >= weekAgo) ||
        (lastOpenedAt && lastOpenedAt >= weekAgo);
      if (recent) activeLast7d += 1;

      activeUsers.push({
        uid,
        email: String(d.email || ""),
        displayName: String(d.displayName || ""),
        photoURL: d.photoURL ? String(d.photoURL) : undefined,
        resourceOpenCount,
        lastOpenedTitle: String(d.lastOpenedTitle || ""),
        lastOpenedAt,
        lastActive,
      });
    }

    activeUsers.sort((a, b) => {
      if (b.resourceOpenCount !== a.resourceOpenCount) {
        return b.resourceOpenCount - a.resourceOpenCount;
      }
      return (b.lastOpenedAt || b.lastActive).localeCompare(
        a.lastOpenedAt || a.lastActive,
      );
    });

    const topResources: TopResource[] = totalsSnap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: String(d.resource_id || doc.id),
          title: String(d.title || "Untitled"),
          subject: String(d.subject || ""),
          opens: Number(d.opens) || 0,
          uniqueOpeners: Number(d.uniqueOpeners) || 0,
          lastOpenedAt: String(d.lastOpenedAt || ""),
        };
      })
      .sort((a, b) => b.opens - a.opens)
      .slice(0, 20);

    const totalOpensFromStats = Number(usageStatsSnap.data()?.totalOpens) || 0;
    const totalOpensFallback = topResources.reduce((sum, r) => sum + r.opens, 0);
    const filesWithOpens =
      totalsCountSnap?.data().count ?? topResources.length;

    const branchBreakdown = Object.entries(byBranch)
      .map(([branch, count]) => ({ branch, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(
      {
        overview: {
          userCount: usersSnap.size,
          activeLast7d,
          totalOpens: totalOpensFromStats || totalOpensFallback,
          filesWithOpens,
          usersWithOpens,
        },
        byBranch: branchBreakdown,
        topResources,
        mostActiveUsers: activeUsers.slice(0, 15),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage stats" },
      { status: 500 },
    );
  }
}

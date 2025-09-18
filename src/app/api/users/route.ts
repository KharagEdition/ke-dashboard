// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";
import { User } from "../../../lib/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10"))
    );
    const search = searchParams.get("search")?.trim() || "";
    const provider = searchParams.get("provider") || "all";
    const subscription = searchParams.get("subscription") || "all";

    // Build base query
    let baseQuery: FirebaseFirestore.Query = db.collection("users");

    // Apply filters - only use indexed fields for where clauses
    if (provider !== "all") {
      baseQuery = baseQuery.where("provider", "==", provider);
    }
    if (subscription !== "all") {
      baseQuery = baseQuery.where("subscriptionType", "==", subscription);
    }

    // Get ALL filtered results for search (not paginated yet)
    const allFilteredQuery = baseQuery.orderBy("createdAt", "desc");
    const allFilteredSnapshot = await allFilteredQuery.get();

    console.log(
      `Fetched ${allFilteredSnapshot.size} users before search/pagination`
    );

    // Convert all filtered results to User objects
    const allUsers: User[] = [];
    allFilteredSnapshot.forEach((doc) => {
      const data = doc.data();
      allUsers.push({
        id: doc.id,
        displayName: data.displayName || "",
        email: data.email || "",
        provider: data.provider || "",
        createdAt: data.createdAt
          ? typeof data.createdAt === "number"
            ? new Date(data.createdAt).toISOString()
            : data.createdAt.toDate?.()?.toISOString() || data.createdAt
          : "",
        lastLogin: data.lastLogin
          ? typeof data.lastLogin === "number"
            ? new Date(data.lastLogin).toISOString()
            : data.lastLogin.toDate?.()?.toISOString() || data.lastLogin
          : "",
        photoUrl: data.photoUrl || "",
        subscriptionType: data.subscriptionType || "free",
      });
    });

    // Apply search filter to ALL users (not just current page)
    let searchedUsers = allUsers;
    if (search) {
      const searchLower = search.toLowerCase();
      searchedUsers = allUsers.filter(
        (user) =>
          user.displayName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      );
    }

    // Now apply pagination to the searched results
    const totalFilteredUsers = searchedUsers.length;
    const offset = (page - 1) * limit;
    const paginatedUsers = searchedUsers.slice(offset, offset + limit);

    console.log(
      `After search: ${searchedUsers.length} users, showing ${paginatedUsers.length} on page ${page}`
    );

    // Calculate stats (you might want to cache this for performance)
    const statsQuery = db.collection("users");
    const allUsersSnapshot = await statsQuery.get();

    let totalCount = 0;
    let subscribedCount = 0;
    let activeToday = 0;
    let newThisWeek = 0;

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    allUsersSnapshot.forEach((doc) => {
      const data = doc.data();
      totalCount++;

      if (data.subscriptionType === "premium") {
        subscribedCount++;
      }

      // Check if active today
      if (data.lastLogin) {
        const lastLogin =
          typeof data.lastLogin === "number"
            ? new Date(data.lastLogin)
            : data.lastLogin.toDate?.() || new Date(data.lastLogin);
        if (lastLogin >= startOfToday) {
          activeToday++;
        }
      }

      // Check if new this week
      if (data.createdAt) {
        const createdAt =
          typeof data.createdAt === "number"
            ? new Date(data.createdAt)
            : data.createdAt.toDate?.() || new Date(data.createdAt);
        if (createdAt >= oneWeekAgo) {
          newThisWeek++;
        }
      }
    });

    const stats = {
      totalUsers: totalCount,
      subscribedUsers: subscribedCount,
      activeToday,
      newThisWeek,
    };

    const totalPages = Math.ceil(totalFilteredUsers / limit);

    return NextResponse.json({
      users: paginatedUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: totalFilteredUsers,
        usersPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats,
      filters: {
        search,
        provider,
        subscription,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";
import { User } from "../../../lib/types";

export async function GET() {
  try {
    const usersSnapshot = await db.collection("users").get();
    const users: User[] = usersSnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as User)
    ); // Cast to User type

    // Create CSV content with proper typing
    const csvHeaders =
      "ID,Display Name,Email,Provider,Subscription,Created At,Last Login\n";
    const csvRows = users
      .map(
        (user: User) =>
          `${user.id},"${user.displayName || "N/A"}","${
            user.email || "N/A"
          }","${user.provider || "N/A"}","${user.subscription || "trial"}","${
            user.createdAt || "N/A"
          }","${user.lastLogin || "N/A"}"`
      )
      .join("\n");

    const csvContent = csvHeaders + csvRows;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=users.csv",
      },
    });
  } catch (error) {
    console.error("Error exporting users:", error);
    return NextResponse.json({ message: "Export failed" }, { status: 500 });
  }
}

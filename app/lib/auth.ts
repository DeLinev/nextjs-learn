import { cookies } from "next/headers";
import { decrypt } from "./session";

export async function getCurrentUserId() {
  const cookieStore = await cookies();
  const encryptedSession = cookieStore.get("session");
  const session = await decrypt(encryptedSession?.value);

  return session?.userId ? { userId: session.userId } : null;
}

export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return !!userId; 
}
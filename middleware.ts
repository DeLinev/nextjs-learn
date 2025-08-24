import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "./app/lib/session";

const publicRoutes = ["/login"];
const privateRoutes = ["/dashboard", "/dashboard/invoices", "/dashboard/customers"];

export async function middleware(request: NextRequest) {
    const requestUrl = request.nextUrl.pathname;
    const isRequestPublic = publicRoutes.includes(requestUrl);
    const isRequestPrivate = privateRoutes.includes(requestUrl);

    const cookieStore = await cookies();
    const encryptedSession = cookieStore.get("session");
    const session = await decrypt(encryptedSession?.value);

    if (isRequestPrivate && !session?.userId) {
        return NextResponse.redirect(new URL("/login", request.nextUrl));
    }

    if (isRequestPublic && session?.userId) {
        return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
}
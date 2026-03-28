import { clerkMiddleware } from "@clerk/nextjs/server";

// Keep middleware minimal to avoid startup-time issues.
// Auth protection is handled by the UI (disable API calls when signed out).
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};

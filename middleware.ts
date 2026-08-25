import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // كل حاجة ماعدا ملفات الـAPI والأصول الثابتة
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

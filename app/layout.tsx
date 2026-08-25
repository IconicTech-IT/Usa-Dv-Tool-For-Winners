import type { ReactNode } from "react";

/**
 * الـlayout ده pass-through بس — اللغة لسه مش معروفة هنا،
 * فـ<html> و<body> بيتعملوا في app/[locale]/layout.tsx.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}

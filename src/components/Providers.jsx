
"use client"
import { SessionProvider } from "next-auth/react";
// import { ThemeProvider } from "next-themes";

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      {/* <ThemeProvider attribute="class" defaultTheme="system" enableSystem> */}
        {children}
      {/* </ThemeProvider> */}
    </SessionProvider>
  );
}
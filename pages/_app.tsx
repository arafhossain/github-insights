import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";

export default function App({ Component, pageProps: {session, ...pageProps} }: AppProps) {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a1a1a",
            color: "#f3f3f3",
            border: "1px solid #333"
          },
          success: { icon: "✅" },
          error: { icon: "❌" },        
        }}
      />
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </>
  )
  
}

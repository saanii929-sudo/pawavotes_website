import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ChatbotWidget from "@/components/chatbot-widget";

// Using system fonts as fallback to avoid Google Fonts connection issues during build
const geistSans = {
  variable: "--font-geist-sans",
};

const geistMono = {
  variable: "--font-geist-mono",
};


export const metadata: Metadata = {
  verification: {
    google: "z0c-IsbG7lVZ19I_I4t1EuQmOq-GrcYfzIQJjDVzJjw",
  },
  title: "Pawavotes",
  description: "A simple and transparent voting experience",
  icons: {
    icon: [
      { url: "/images/fav_icon.png", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/images/fav_icon.png",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            success: {
              iconTheme: {
                primary: '#16a34a',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#dc2626',
                secondary: '#fff',
              },
            },
          }}
        />
        {children}

      {/* Chatbot Widget */}
      <ChatbotWidget />
      </body>
    </html>
  );
}
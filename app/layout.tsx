import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { LanguageProvider } from "@/components/providers/language-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { RestaurantProvider } from "@/components/providers/restaurant-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = localFont({
  src: "../public/fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: '100 900',
  display: "swap",
});

const cormorant = localFont({
  src: "../public/fonts/cormorant-latin.woff2",
  variable: "--font-cormorant",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maison Or — The Art of Hospitality",
  description:
    "Discover the Maison Or menu, order from your table, and enjoy a considered dining experience in Casablanca.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <LanguageProvider>
            <RestaurantProvider>
              {children}
              <Toaster richColors position="top-center" />
            </RestaurantProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

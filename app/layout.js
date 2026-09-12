import { Geist } from "next/font/google";
import "@/app/globals.css";
import { AppProvider } from "@/components/app-provider";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "FlixCasa Pro — CasaStream",
  description: "Smart Media Streaming & Downloading for Android TV, Mobile, Laptop & CasaOS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-white">
        <ServiceWorkerRegistration />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}

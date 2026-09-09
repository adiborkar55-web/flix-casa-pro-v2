import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "@/app/globals.css";
import { AppProvider } from "@/components/app-provider";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const geist = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "FlixCasa Pro — CasaStream",
	description: "Smart Media Streaming & Downloading for Android TV, Mobile, Laptop & CasaOS",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
	themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${geist.variable} h-full antialiased`}>
			<head>
				<link rel="manifest" href="/manifest.json" />
			</head>
			<body className="min-h-full flex flex-col bg-zinc-950 text-white">
				<ServiceWorkerRegistration />
				<AppProvider>{children}</AppProvider>
			</body>
		</html>
	);
}

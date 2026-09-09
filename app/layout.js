import { jsx as _jsx } from "react/jsx-runtime";
import { Geist } from "next/font/google";
import "@/app/globals.css";
import { AppProvider } from "@/components/app-provider";
const geist = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
export const metadata = {
    title: "FlixCasa Pro — CasaStream",
    description: "Smart Media Streaming & Downloading for Android TV, Mobile, Laptop & CasaOS",
};
export default function RootLayout({ children }) {
    return (_jsx("html", { lang: "en", className: `${geist.variable} h-full antialiased`, children: _jsx("body", { className: "min-h-full flex flex-col bg-zinc-950 text-white", children: _jsx(AppProvider, { children: children }) }) }));
}

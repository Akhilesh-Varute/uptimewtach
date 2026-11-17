import { Host_Grotesk, Atkinson_Hyperlegible_Mono } from "next/font/google";

const host = Host_Grotesk({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-host", display: "swap" });
const atkinson = Atkinson_Hyperlegible_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-atkinson", display: "swap" });

export const fontClass = `${host.variable} ${atkinson.variable}`;

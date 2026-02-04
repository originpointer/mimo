import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar/sidebar";
import { TwinPageClient } from "./twin-page-client";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Browser Twin - Digital State",
    description: "Real-time browser digital twin state monitoring",
  };
}

/**
 * Twin page - Browser digital twin dashboard
 *
 * Displays browser state including windows, tabs, and their properties.
 * Uses mock data for demonstration purposes.
 */
export default async function TwinPage() {
  return (
    <main className="flex h-dvh">
      <Sidebar />
      <TwinPageClient />
    </main>
  );
}

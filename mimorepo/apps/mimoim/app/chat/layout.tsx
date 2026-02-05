import { Sidebar } from "@/components/sidebar/sidebar";

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="flex h-dvh">
            <Sidebar />
            {children}
        </main>
    );
}

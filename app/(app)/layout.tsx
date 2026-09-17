import { requireProfile } from "@/lib/dal";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="shell">
      <Sidebar profile={profile} />
      <div className="main">{children}</div>
    </div>
  );
}

import { requireProfile } from "@/lib/dal";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const profile = await requireProfile();
  return <SettingsForm profile={profile} />;
}

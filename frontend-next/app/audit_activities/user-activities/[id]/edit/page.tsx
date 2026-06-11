import { redirect } from "next/navigation";

export default function UserActivitiesEditRedirectPage() {
  redirect("/audit_activities/user-activities");
}

import { redirect } from "next/navigation";

export default function UserActivitiesCreateRedirectPage() {
  redirect("/audit_activities/user-activities");
}

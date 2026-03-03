import { redirect } from "next/navigation";

export default function LegacyNew() {
  redirect("/incident/0/details");
}

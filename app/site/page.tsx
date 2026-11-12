import { redirect } from "next/navigation";

/** /site war die Ort-Detailansicht; der 308-Redirect in next.config greift zuerst. */
export default function SiteRedirectPage() {
  redirect("/simulator");
}

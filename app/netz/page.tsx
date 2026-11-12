import { permanentRedirect } from "next/navigation";

/** Früher Ort-Netzsicht; der 308-Redirect in next.config greift zuerst. */
export default function NetzRedirect() {
  permanentRedirect("/simulator");
}

import { permanentRedirect } from "next/navigation";

export default function SzenarienRedirect() {
  permanentRedirect("/site?view=netz#grenze-erloes");
}

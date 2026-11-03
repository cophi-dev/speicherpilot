import { permanentRedirect } from "next/navigation";

export default function SzenarienRedirect() {
  permanentRedirect("/ort?sicht=netz#grenze");
}

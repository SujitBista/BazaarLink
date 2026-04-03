import { redirect } from "next/navigation";

/** Legacy URL; customer order history lives at `/orders`. */
export default function AccountOrdersRedirectPage() {
  redirect("/orders");
}

import { notFound } from "next/navigation";

/** Any address we do not serve renders the localized 404 page instead of a bare error. */
export default function UnknownPage(): never {
  notFound();
}

import { Suspense } from "react";
import EventDetailsPage from "./event-details-page";

export default function Page() {
  return (
    <Suspense>
      <EventDetailsPage />
    </Suspense>
  );
}

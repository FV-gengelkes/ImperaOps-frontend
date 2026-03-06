import { Suspense } from "react";
import EventDetailsPage from "../[publicId]/details/event-details-page";

export default function Page() {
  return (
    <Suspense>
      <EventDetailsPage />
    </Suspense>
  );
}

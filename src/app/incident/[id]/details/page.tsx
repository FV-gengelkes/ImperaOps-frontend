import { Suspense } from "react";
import IncidentDetailsPage from "./incident-details-page";

export default function Page() {
  return (
    <Suspense>
      <IncidentDetailsPage />
    </Suspense>
  );
}

import { useNavigate } from "react-router-dom";

import { TripEditorForm } from "@/components/TripEditorForm";
import { appendLocalTrip } from "@/lib/local-trips";

export function NewTripOnline() {
  const navigate = useNavigate();

  return (
    <TripEditorForm
      heading="Add trip"
      description="Add a map pin, photos, and details."
      cancelPath="/trips"
      submitLabel="Save trip"
      initial={{}}
      useGeolocationPin
      onSave={({ input, photos, thumbnailPhotoIndex, favouritePhotoIndices, visits }) => {
        const created = appendLocalTrip(
          input,
          photos,
          thumbnailPhotoIndex,
          favouritePhotoIndices,
          visits,
        );
        navigate(`/trips/${created.id}`, { replace: true });
      }}
    />
  );
}

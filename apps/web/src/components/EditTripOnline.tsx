import { Link, useNavigate, useParams } from "react-router-dom";

import { TripEditorForm } from "@/components/TripEditorForm";
import { Button } from "@/components/ui/button";
import { getLocalTrip, updateLocalTrip } from "@/lib/local-trips";

export function EditTripOnline() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const trip = id ? getLocalTrip(id) : undefined;

  if (!id) {
    return <p className="text-[rgb(var(--muted))]">Missing trip id.</p>;
  }

  if (!trip) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/trips">Back to trips</Link>
        </Button>
        <p className="text-[rgb(var(--muted))]">That trip was not found.</p>
      </div>
    );
  }

  const tagsText = trip.tags.join(", ");

  return (
    <TripEditorForm
      heading="Edit trip"
      description="Changes stay on this device only."
      cancelPath={`/trips/${trip.id}`}
      submitLabel="Save changes"
      initial={{
        title: trip.title,
        visits: trip.visits,
        notes: trip.notes,
        tagsText,
        rating: trip.rating,
        isFavourite: trip.isFavourite,
        placeName: trip.placeName ?? "",
        pin:
          trip.latitude != null && trip.longitude != null
            ? { lat: trip.latitude, lng: trip.longitude }
            : undefined,
        photos: trip.photoDataUrls,
        thumbnailPhotoIndex: trip.thumbnailPhotoIndex,
        favouritePhotoIndices: trip.favouritePhotoIndices,
      }}
      useGeolocationPin={trip.latitude == null || trip.longitude == null}
      onSave={({ input, photos, thumbnailPhotoIndex, favouritePhotoIndices, visits }) => {
        const updated = updateLocalTrip(
          trip.id,
          input,
          photos,
          thumbnailPhotoIndex,
          favouritePhotoIndices,
          visits,
        );
        if (!updated) throw new Error("Trip disappeared—try again from the list.");
        navigate(`/trips/${trip.id}`, { replace: true });
      }}
    />
  );
}

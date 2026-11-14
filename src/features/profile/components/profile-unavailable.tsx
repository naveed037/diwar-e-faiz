import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/features/auth/components/auth-bits";

export function ProfileUnavailable() {
  return (
    <div className="space-y-6">
      <FormAlert tone="info">
        Profiles are temporarily unavailable. Please try again a little later.
        {process.env.NODE_ENV === "development" && (
          <> (Developer: the server-side FIREBASE_* variables are missing — add them to .env.local or your host&apos;s settings.)</>
        )}
      </FormAlert>
      <ButtonLink href="/" variant="outline">
        Back to home
      </ButtonLink>
    </div>
  );
}

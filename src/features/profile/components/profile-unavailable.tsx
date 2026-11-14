import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/features/auth/components/auth-bits";

export function ProfileUnavailable() {
  return (
    <div className="space-y-6">
      <FormAlert tone="info">
        Profiles are temporarily unavailable. If you run this site, add the Firebase Admin credentials to <code>.env.local</code>.
      </FormAlert>
      <ButtonLink href="/" variant="outline">
        Back to home
      </ButtonLink>
    </div>
  );
}

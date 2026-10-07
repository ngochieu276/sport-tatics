import type { UserProfile } from "./domain/schemas.js";

export type AppEnv = {
  Variables: {
    user: UserProfile;
  };
};

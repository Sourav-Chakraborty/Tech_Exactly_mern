import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { env } from "./env";

export type OAuthProvider = "google" | "facebook";

// Provider-independent profile handed from the strategies to the auth service.
export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  name: string;
  email?: string;
}

// Passport types the verified "user" as Express.User (our authenticated-user shape). During the
// OAuth handshake it carries the provider profile instead; it is read only by the custom callback
// in auth.controller and never assigned to req.user.
const asPassportUser = (profile: OAuthProfile) => profile as unknown as Express.User;

const callbackURL = (provider: OAuthProvider) =>
  `${env.serverUrl}/api/v1/auth/${provider}/callback`;

// Passport only runs the OAuth protocol here. The verify callbacks just normalize the
// provider profile; finding/creating the user and issuing JWTs happens in the auth service.
// A provider is registered only when its credentials are present in .env.
if (env.oauth.google) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.oauth.google.clientId,
        clientSecret: env.oauth.google.clientSecret,
        callbackURL: callbackURL("google"),
      },
      (_accessToken, _refreshToken, profile, done) => {
        // Google only returns verified emails, but check the flag anyway.
        const email = profile.emails?.find((e) => e.verified)?.value;
        done(
          null,
          asPassportUser({
            provider: "google",
            providerId: profile.id,
            name: profile.displayName,
            email,
          }),
        );
      },
    ),
  );
}

if (env.oauth.facebook) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: env.oauth.facebook.clientId,
        clientSecret: env.oauth.facebook.clientSecret,
        callbackURL: callbackURL("facebook"),
        profileFields: ["id", "displayName", "emails"],
        graphAPIVersion: "v23.0", // the library default (v3.2) is long deprecated
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value;
        done(
          null,
          asPassportUser({
            provider: "facebook",
            providerId: profile.id,
            name: profile.displayName,
            email,
          }),
        );
      },
    ),
  );
}

export const isProviderEnabled = (provider: OAuthProvider) => Boolean(env.oauth[provider]);

export default passport;

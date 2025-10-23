import NextAuth, { type NextAuthOptions } from "next-auth";
import GithubProvider, { type GithubProfile } from "next-auth/providers/github";
import type { JWT } from "next-auth/jwt";
import type { Account, Profile, User } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({
      token,
      account,
      profile,
      user,
    }: {
      token: JWT;
      account?: Account | null;
      profile?: Profile | GithubProfile | null;
      user?: User;
    }) {
      if (account && profile && "login" in profile) {
        const ghProfile = profile as GithubProfile;
        token.accessToken = account.access_token;
        token.username = ghProfile.login;
      }
      return token;
    },

    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        username: token.username as string,
      };
    },
  },
};

export default NextAuth(authOptions);
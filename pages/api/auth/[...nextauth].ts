import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { GithubProfile } from "next-auth/providers/github";

export default NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
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
});

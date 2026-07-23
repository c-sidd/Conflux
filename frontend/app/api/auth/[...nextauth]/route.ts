import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // When first signing in, account will be available
      if (account && account.id_token) {
        try {
          // Send the id_token to our Django backend to get our own JWT tokens
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(`${backendUrl}/api/auth/google/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: account.id_token }),
          });

          if (res.ok) {
            const data = await res.json();
            // Store the backend access token and user info inside the NextAuth token
            token.accessToken = data.access;
            token.refreshToken = data.refresh;
            token.user = data.user;
          } else {
            console.error("Backend auth failed", await res.text());
          }
        } catch (error) {
          console.error("Error communicating with backend:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Pass the custom properties from the JWT to the session object
      // @ts-ignore
      session.accessToken = token.accessToken;
      // @ts-ignore
      session.user = token.user || session.user;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

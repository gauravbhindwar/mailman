import CredentialsProvider from "next-auth/providers/credentials";
import { connect } from "../../../../lib/dbConfig";
import User from "../../../../models/User";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Please enter email and password');
          }

          await connect();

          const user = await User.findOne({ email: credentials.email }).select('+password');
          
          if (!user) {
            throw new Error('Invalid credentials');
          }

          if (!user.isVerified) {
            throw new Error('Please verify your email address before logging in');
          }

          const isPasswordCorrect = await user.comparePassword(credentials.password);
          
          if (!isPasswordCorrect) {
            throw new Error('Invalid credentials');
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            username: user.username,
            userId: user._id.toString() // Ensure userId is included
          };
        } catch (error) {
          console.error('Auth Error:', error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.user = user;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.user) {
        session.user = token.user;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    // error: '/auth/error', // Updated error page
    signOut: '/'
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};
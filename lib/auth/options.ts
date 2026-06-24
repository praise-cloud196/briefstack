import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('[AUTH authorize] === ENTER ===', {
          email: credentials?.email ?? '(missing)',
          hasPassword: !!credentials?.password,
          timestamp: new Date().toISOString(),
        });

        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH authorize] FAIL: missing credentials');
            throw new Error('Missing email or password');
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          console.log('[AUTH authorize] user lookup:', {
            found: !!user,
            hasPassword: !!user?.password,
            email: credentials.email,
          });

          if (!user || !user.password) {
            console.log('[AUTH authorize] FAIL: user not found or no password');
            throw new Error('User not found or password not set');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);

          console.log('[AUTH authorize] password compare:', { isValid });

          if (!isValid) {
            console.log('[AUTH authorize] FAIL: invalid password');
            throw new Error('Invalid password');
          }

          console.log('[AUTH authorize] SUCCESS, returning user:', {
            id: user.id,
            email: user.email,
            name: user.name,
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('[AUTH authorize] CAUGHT ERROR:', {
            message: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack?.split('\n').slice(0, 4).join('\n') : undefined,
          });
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth',
    error: '/auth',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      console.log('[AUTH jwt callback]', {
        trigger,
        hasToken: !!token,
        hasUser: !!user,
        tokenId: token?.sub ?? token?.id,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token, trigger }) {
      console.log('[AUTH session callback]', {
        trigger,
        hasSession: !!session,
        hasToken: !!token,
        tokenId: token?.sub ?? token?.id,
        sessionUserId: (session.user as any)?.id,
        timestamp: new Date().toISOString(),
      });
      if (token && session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
export default authOptions;

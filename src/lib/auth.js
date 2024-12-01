
import { getServerSession } from "next-auth";
import { authOptions } from "../app/api/auth/[...nextauth]/authOptions";

export const auth = async () => {
  const session = await getServerSession(authOptions);
  return session;
};

export const requireAuth = async () => {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return session;
};
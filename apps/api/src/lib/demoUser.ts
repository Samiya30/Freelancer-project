import { prisma } from "./prisma.js";

export async function getDemoUser() {
  const user = await prisma.user.upsert({
    where: {
      email: "demo@freelanceos.local",
    },
    update: {},
    create: {
      name: "FreelanceOS Demo User",
      email: "demo@freelanceos.local",
    },
  });

  return user;
}
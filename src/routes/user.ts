import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: body.email,
    },
  });

  if (existingUser) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json({ error: "Email address already in use" });
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);

  try {
    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
      },
    });

    const token = await sign({ id: newUser.id }, c.env.JWT_SECRET);

    return c.json({
      jwt: token,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to create user" });
  } finally {
    await prisma.$disconnect();
  }
});

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const user = await prisma.user.findUnique({
    where: {
      email: body.email,
    },
  });

  if (!user) {
    c.status(StatusCodes.FORBIDDEN);
    return c.json({ error: "user not found" });
  }

  const isPasswordValid = await bcrypt.compare(body.password, user.password);
  if (!isPasswordValid) {
    c.status(StatusCodes.FORBIDDEN);
    return c.json({ error: "invalid password" });
  }

  const token = await sign({ id: user.id }, c.env.JWT_SECRET);
  return c.json({ jwt: token });
});

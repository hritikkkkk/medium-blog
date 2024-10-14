import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { StatusCodes } from "http-status-codes";

export const LikeRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

const getPrismaClient = (databaseUrl: string) => {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  }).$extends(withAccelerate());
};

LikeRouter.use(async (c, next) => {
  const jwt = c.req.header("Authorization");
  if (!jwt) {
    c.status(StatusCodes.UNAUTHORIZED);
    return c.json({ error: "unauthorized" });
  }

  try {
    const token = jwt.split(" ")[1];
    const payload = await verify(token, c.env.JWT_SECRET);
    if (!payload) {
      c.status(StatusCodes.UNAUTHORIZED);
      return c.json({ error: "unauthorized" });
    }
    c.set("userId", payload.id as string);
    await next();
  } catch (error) {
    c.status(StatusCodes.UNAUTHORIZED);
    return c.json({ error: "unauthorized" });
  }
});

LikeRouter.post("/:id/toggle-like", async (c) => {
  const userId = c.get("userId");
  const prisma = getPrismaClient(c.env?.DATABASE_URL);
  const postId = c.req.param("id");

  try {
    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        postId,
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      return c.json({ message: "Post unliked" }, StatusCodes.OK);
    } else {
      const like = await prisma.like.create({
        data: {
          userId,
          postId,
        },
      });
      return c.json({ message: "Post liked", like }, StatusCodes.CREATED);
    }
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to toggle like" });
  } finally {
    await prisma.$disconnect();
  }
});

LikeRouter.get("/:id/likes", async (c) => {
  const prisma = getPrismaClient(c.env?.DATABASE_URL);
  const postId = c.req.param("id");

  try {
    const likes = await prisma.like.findMany({
      where: {
        postId,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return c.json({ likes }, StatusCodes.OK);
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to retrieve likes" });
  } finally {
    await prisma.$disconnect();
  }
});

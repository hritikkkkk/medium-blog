import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { StatusCodes } from "http-status-codes";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use(async (c, next) => {
  const jwt = c.req.header("Authorization");
  if (!jwt) {
    c.status(StatusCodes.UNAUTHORIZED);
    return c.json({ error: "unauthorized" });
  }
  const token = jwt.split(" ")[1];
  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    if (!payload) {
      c.status(StatusCodes.UNAUTHORIZED);
      return c.json({ error: "unauthorized" });
    }
    //@ts-ignore
    c.set("userId", payload.id);
    await next();
  } catch (error) {
    c.status(StatusCodes.UNAUTHORIZED);
    return c.json({ error: "unauthorized" });
  }
});

const getPrismaClient = (databaseUrl: string) => {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  }).$extends(withAccelerate());
};

blogRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const prisma = getPrismaClient(c.env?.DATABASE_URL);

  try {
    const body = await c.req.json();
    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: userId,
      },
    });
    return c.json(
      {
        id: post.id,
      },
      StatusCodes.CREATED
    );
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to create post" });
  } finally {
    await prisma.$disconnect();
  }
});

blogRouter.put("/", async (c) => {
  const userId = c.get("userId");
  const prisma = getPrismaClient(c.env?.DATABASE_URL);

  try {
    const body = await c.req.json();
    await prisma.post.update({
      where: {
        id: body.id,
        authorId: userId,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });
    return c.text("updated post", StatusCodes.OK);
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to update post" });
  } finally {
    await prisma.$disconnect();
  }
});

blogRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = getPrismaClient(c.env?.DATABASE_URL);

  try {
    const post = await prisma.post.findUnique({
      where: {
        id,
      },
    });
    if (!post) {
      c.status(StatusCodes.NOT_FOUND);
      return c.json({ error: "Post not found" });
    }
    return c.json(post, StatusCodes.OK);
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to retrieve post" });
  } finally {
    await prisma.$disconnect();
  }
});

blogRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const prisma = getPrismaClient(c.env?.DATABASE_URL);

  try {
    await prisma.post.deleteMany({
      where: {
        id: id,
        authorId: userId,
      },
    });
    return c.text("deleted post", StatusCodes.OK);
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to delete post" });
  } finally {
    await prisma.$disconnect();
  }
});

blogRouter.get("/", async (c) => {
  const prisma = getPrismaClient(c.env?.DATABASE_URL);
  const page = parseInt(c.req.query("page") || "1", 10);
  const pageSize = parseInt(c.req.query("pageSize") || "10", 10);

  try {
    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count(),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return c.json({
      posts,
      page,
      pageSize,
      totalCount,
      totalPages,
    }, StatusCodes.OK);
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to retrieve posts" });
  } finally {
    await prisma.$disconnect();
  }
});


import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { StatusCodes } from "http-status-codes";
import { createBlogInput, updateBlogInput } from "@npm_devs/medium-common";

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
  const body = await c.req.json();
  const parsed = createBlogInput.safeParse(body);
  if (!parsed.success) {
    c.status(StatusCodes.UNPROCESSABLE_ENTITY);
    return c.json({ message: "Inputs not correct" });
  }

  const userId = c.get("userId");
  const prisma = getPrismaClient(c.env?.DATABASE_URL);

  try {
    const post = await prisma.post.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        authorId: userId,
      },
    });
    return c.json({ post }, StatusCodes.CREATED);
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to create post" });
  } finally {
    await prisma.$disconnect();
  }
});

blogRouter.put("/:id", async (c) => {
  const userId = c.get("userId");
  const prisma = getPrismaClient(c.env?.DATABASE_URL);

  const postId = c.req.param("id");
  const body = await c.req.json();
  body.id = postId;

  const { success } = updateBlogInput.safeParse(body);
  if (!success) {
    c.status(StatusCodes.UNPROCESSABLE_ENTITY);
    return c.json({ message: "Inputs not correct" });
  }

  try {
    const updatedPost = await prisma.post.update({
      where: {
        id: postId,
        authorId: userId,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });

    return c.json(
      { message: "Post updated successfully", post: updatedPost },
      StatusCodes.OK
    );
  } catch (error: any) {
    if (error.code === "P2025") {
      // Prisma error for record not found
      c.status(StatusCodes.NOT_FOUND);
      return c.json({ error: "Post not found or you're not the author." });
    }
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
    const post = await prisma.post.findUnique({ where: { id } });
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
  const prisma = getPrismaClient(c.env?.DATABASE_URL);
  const userId = c.get("userId");
  const postId = c.req.param("id");

  try {
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });
    if (!existingPost) {
      c.status(StatusCodes.NOT_FOUND);
      return c.json({ error: "Post not found." });
    }

    if (existingPost.authorId !== userId) {
      c.status(StatusCodes.FORBIDDEN);
      return c.json({
        error: "You do not have permission to delete this post.",
      });
    }

    await prisma.post.delete({ where: { id: postId } });
    return c.json({ message: "Post deleted successfully." });
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to delete post." });
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
        orderBy: {
          createdAt: "desc",
        },
        include: {
          author: {
            select: {
              name: true, 
            },
          },
        },
      }),
      prisma.post.count(),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return c.json(
      {
        posts,
        page,
        pageSize,
        totalCount,
        totalPages,
      },
      StatusCodes.OK
    );
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to retrieve posts" });
  } finally {
    await prisma.$disconnect();
  }
});


blogRouter.get("/user/posts", async (c) => {
  const userId = c.get("userId");
  const prisma = getPrismaClient(c.env?.DATABASE_URL);
  try {
    const userPosts = await prisma.post.findMany({
      where: {
        authorId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return c.json(userPosts);
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to retrieve posts" });
  } finally {
    await prisma.$disconnect();
  }
});

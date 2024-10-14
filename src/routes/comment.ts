import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { StatusCodes } from "http-status-codes";

export const CommentRouter = new Hono<{
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

CommentRouter.use(async (c, next) => {
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

CommentRouter.post("/:id/comment", async (c) => {
  const userId = c.get("userId");
  const prisma = getPrismaClient(c.env?.DATABASE_URL);
  const postId = c.req.param("id");

  const body = await c.req.json();
  const { content } = body;

  if (!content) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json({ error: "Content cannot be empty." });
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        postId,
      },
    });

    return c.json({ message: "Comment added", comment }, StatusCodes.CREATED);
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to add comment" });
  } finally {
    await prisma.$disconnect();
  }
});

CommentRouter.get("/:id/comments", async (c) => {
  const prisma = getPrismaClient(c.env?.DATABASE_URL);
  const postId = c.req.param("id");

  try {
    const comments = await prisma.comment.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return c.json({ comments }, StatusCodes.OK);
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to retrieve comments" });
  } finally {
    await prisma.$disconnect();
  }
});

CommentRouter.delete("/comments/:commentId", async (c) => {
  const userId = c.get("userId");
  const prisma = getPrismaClient(c.env?.DATABASE_URL);
  const commentId = c.req.param("commentId");

  try {
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      c.status(StatusCodes.NOT_FOUND);
      return c.json({ error: "Comment not found." });
    }

    if (existingComment.userId !== userId) {
      c.status(StatusCodes.FORBIDDEN);
      return c.json({
        error: "You do not have permission to delete this comment.",
      });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return c.json({ message: "Comment deleted successfully." });
  } catch (error) {
    c.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return c.json({ error: "Failed to delete comment." });
  } finally {
    await prisma.$disconnect();
  }
});

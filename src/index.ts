import { Hono } from "hono";
import { cors } from "hono/cors";
import { userRouter } from "./routes/user";
import { blogRouter } from "./routes/blog";
import quoteRoute from "./routes/quote";
import { LikeRouter } from "./routes/like";
import { CommentRouter } from "./routes/comment";

export const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();
app.use("/*", cors());
app.route("/api/v1/user", userRouter);
app.route("/api/v1/blog", blogRouter);
app.route("/api/v1", LikeRouter);
app.route("/api/v1", CommentRouter);
app.route("/api/v1", quoteRoute);

export default app;

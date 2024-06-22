import { Hono } from "hono";
import { userRouter } from "./routes/user";

export const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

app.route("/api/v1/user", userRouter);

export default app;

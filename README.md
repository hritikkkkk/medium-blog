```markdown
# Hono API with Prisma on Cloudflare Workers

This project is a RESTful API built using [Hono](https://github.com/honojs/hono) and [Prisma](https://www.prisma.io/) deployed on Cloudflare Workers. It includes JWT authentication and CRUD operations for managing blogs.

## Table of Contents
- [Hono API with Prisma on Cloudflare Workers](#hono-api-with-prisma-on-cloudflare-workers)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Deployment](#deployment)
  - [Environment Variables](#environment-variables)
  - [API Endpoints](#api-endpoints)
    - [User Signup](#user-signup)
    - [User Signin](#user-signup)
    - [Create a Blog](#create-a-blog)
    - [Update a Blog](#update-a-blog)
    - [Get a Blog by ID](#get-a-blog-by-id)
    - [Delete a Blog by ID](#delete-a-blog-by-id)
    - [Get All Blogs with Pagination](#get-all-blogs-with-pagination)
 
## Prerequisites

- Node.js and npm
- Wrangler CLI: `npm install -g wrangler`
- A Cloudflare account and a Workers KV namespace

## Setup

1. Clone the repository:

```bash
git clone https://github.com/hritikkkkk/medium-blog.git
cd your-repo
```

2. Install dependencies:

```bash
npm install
```

3. Set up Prisma:

Update your `prisma/schema.prisma` file with the appropriate data source and then generate the client:

```bash
npx prisma generate --no-engine
```

## Deployment

1. Configure your `wrangler.toml` file:

```toml
name = "your-app-name"
type = "javascript"
compatibility_date = "2023-06-23"

[vars]
DATABASE_URL = "your-pooled-database-url"
JWT_SECRET = "your-jwt-secret"


```

2. Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Environment Variables

- `DATABASE_URL`: URL of your database.

## API Endpoints


### User Signup

**URL**: `POST /api/v1/user/signup`

**Body**:
```json
{
  "email": "email@gmail.com",
  "password": "email"
}
```

### User Signin

**URL**: `PUT /api/v1/user/signin`

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "email": "email@gmail.com",
  "password": "email"
}
```
### Create a Blog

**URL**: `POST /api/v1/blog`

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "title": "Sample Post Title",
  "content": "This is the content of the sample post."
}
```

### Update a Blog

**URL**: `PUT /api/v1/blog`

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "id": "POST_ID_TO_UPDATE",
  "title": "Updated Post Title",
  "content": "This is the updated content of the post."
}
```

### Get a Blog by ID

**URL**: `GET /api/v1/blog/:id`

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Delete a Blog by ID

**URL**: `DELETE /api/v1/blog/:id`

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get All Blogs with Pagination

**URL**: `GET /api/v1/blog`

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters**:
- `page`: The page number to retrieve (e.g., `1`).
- `pageSize`: The number of posts per page (e.g., `10`).

deployed application with query parameters: `https://backend.hritik-7827.workers.dev/api/v1/blog?page=1&pageSize=10`



FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Next.js inlines NEXT_PUBLIC_* at build time. Prerender (e.g. /admin/users) runs createClient()
# and fails if these are missing. They are NOT read from .env.local inside the image.
#
# On the build host, export both vars, then either:
#   docker build --build-arg NEXT_PUBLIC_SUPABASE_URL --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY .
# (Docker picks values from the environment when --build-arg NAME has no "=value")
# or pass explicit --build-arg NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co ...
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

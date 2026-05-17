FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Do NOT set NEXT_PUBLIC_* via ARG/ENV here unless your deploy passes real values:
# empty build-args become empty strings and override `.env.local` inside the image.
# For local/server builds, place `.env.local` (or `.env.production`) next to the context
# before `docker build`, or export vars and use --build-arg as documented in README.

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

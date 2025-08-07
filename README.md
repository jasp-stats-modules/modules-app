Welcome to JASP stats modules app!

A web application that allows you to search/filter all the available JASP modules and install them.

A GitHub workflow can be triggered manually to build the app and deploy it to GitHub Pages.

# Getting Started

To run this application:

```bash
pnpm install
# Scrape a list of JASP module and their release assets from GitHub and save as src/index.json
export GITHUB_TOKEN=<your personal fine grained access token, only access to public repositories is needed and no other permissions>
pnpm scrape
pnpm start  
```
volta
# Building For Production

To build this application for production:

```bash
pnpm scrape
pnpm build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
pnpm test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.


## Routing
This project uses [TanStack Router](https://tanstack.com/router). The initial setup is a file based router. Which means that the routes are managed as files in `src/routes`.

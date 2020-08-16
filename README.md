# comment-city

> Excuse me, I'm looking to get to Comment Town?

> Comment Town hasn't been here for eighty years. (We incorporated into Comment City).

My blog is a static website. I want visitors to be able to leave comments, but I didn't want to use a bloated third party plugin (like disqus) or run a backend to store the comments. My solution is to store my comments directly in the same repository as the static site. Each blog page comes with a `comments` file, and adding a comment would involve opening a pull request to that file, which would be incorporated into the blog during the build step. My static site is set up to deploy with each new commit, so after I merge the comment, it appears on the website after about a minute.

This serverless function recieves a comment via form submission from a static site, then opens a PR to the static site adding the comment.

### set up locally for development

I host this function on [vercel](https://vercel.com/docs/serverless-functions/introduction) and my static site on github, but I imagine setting it up on a different provider necessitates similar procedures.

1. install the [vercel cli](https://vercel.com/download), then run `vercel` once to log in.
2. set up environment variables in the project: 
  - `GITHUB_AUTH_TOKEN`, create a new gitub [personal access token](https://github.com/settings/tokens/new)
  - `GITHUB_USER`, your github username
  - `GITHUB_REPO`, the repository name of your static site.
3. run `vercel dev` to host the function locally. Vercel has separate dev environment variables and production environment variables, so if you use vercel's local development feature (which is great, highly recommended) you will need to set the environment variables in both places. 

### deploy

I host this function on vercel, the deploy command is: `vercel`.

You can set up your vercel project to automatically deploy with every github commit (it's great!)

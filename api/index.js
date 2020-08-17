const fetch = require("node-fetch");

module.exports = async (req, res) => {
  const { body } = req;
  // form fields should include:
  // `name`: commenter name
  // `url`: commenter's social url (or personal site)
  // `color`: my blog lets people choose an accent color for their comment :)
  // `comment`: required. the comment itself
  // `path`: required. the path of the comment file to append comment to.
  const { name: commenter, url, color, comment, path } = body;

  // Don't forget to set up environmental variables in your lambda function service
  const owner = process.env.GITHUB_USER;
  const repo = process.env.GITHUB_REPO;
  // Github personal access token https://github.com/settings/tokens
  const token = process.env.GITHUB_AUTH_TOKEN;

  const contentEndpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const referenceEndpoint = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
  const pullsEndpoint = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  const commitsEndpoint = `https://api.github.com/repos/${owner}/${repo}/commits`;

  // Authentication header for Github API.
  const headers = {
    authorization: `token ${token}`,
  };

  // API call #1: Fetch the comments file from the static site repository
  const existingFile = await fetch(contentEndpoint, {
    method: "GET",
    headers,
  }).then((res) => res.json());

  // Github sends files in base64, probably to make it smaller. Unencode it here
  const file = Buffer.from(existingFile.content, "base64").toString("utf-8");

  // Append new comment to comments file.
  // My static site reads comments in yaml format.
  const updatedComment = `${file}
- name: ${commenter}
  date: ${new Date().toLocaleDateString()}
  url: ${url}
  color: ${color}
  comment: |
    ${comment}
  `;

  // Reencode comments file to base64
  const updatedCommentEncoded = Buffer.from(updatedComment, "utf-8").toString(
    "base64"
  );

  const branchName = `comment-${Date.now()}`;

  // API call #2) get latest commit on static site repo
  const commits = await fetch(`${commitsEndpoint}?per_page=1`, {
    method: "GET",
    headers,
  }).then((res) => res.json());

  // API call #3) use latest commit SHA to create a new reference (aka branch) on the static site
  const branch = await fetch(referenceEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      accept: "application/vnd.github.v3+json",
      sha: commits[0].sha,
      ref: `refs/heads/${branchName}`,
    }),
  });

  const pullTitle = `Comment by ${commenter} on ${new Date().toLocaleString()}`;

  // API call #4) create a commit on that new branch we just made
  const commit = await fetch(contentEndpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      accept: "application/vnd.github.v3+json",
      message: pullTitle,
      content: updatedCommentEncoded,
      sha: existingFile.sha,
      branch: branchName,
    }),
  });

  const pullMessage = `Hi ${commenter}!

  Thanks for writing a comment. It will appear on the site a minute after it is approved.

  If you have a github account you can get notified when your comment is merged by clicking "Subscribe" on the right.

  Have a nice day \\o/`;

  // API call #5) open a pull request with the new branch
  const pull = await fetch(pullsEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      accept: "application/vnd.github.v3+json",
      title: pullTitle,
      head: branchName,
      base: "master",
      body: pullMessage,
      maintainer_can_modify: true,
    }),
  }).then((res) => res.json());

  // Redirect user to new github pull request page after submitting comment.
  // The experience could be improved with some client-side javascript.
  res.writeHead(302, { location: pull.html_url });
  res.end();
};

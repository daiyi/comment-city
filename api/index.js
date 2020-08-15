const fetch = require("node-fetch");

module.exports = async (req, res) => {
  const { body } = req;
  const { name: commenter, color, comment, path } = body;

  // Github personal access token
  // https://github.com/settings/tokens
  const token = process.env.GITHUB_AUTH_TOKEN;
  const owner = process.env.GITHUB_USER;
  const repo = process.env.GITHUB_REPO;
  const contentEndpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`; // path = comments.yaml
  const referenceEndpoint = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
  const pullsEndpoint = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  const commitsEndpoint = `https://api.github.com/repos/${owner}/${repo}/commits`;

  const headers = {
    authorization: `token ${token}`,
  };

  // Use the Contents API from GitHub
  // https://developer.github.com/v3/repos/contents/#get-contents
  let existingFile;
  try {
    existingFile = JSON.parse(
      await fetch(contentEndpoint, {
        method: "GET",
        headers,
      }).then((res) => res.text())
    );
  } catch (e) {
    console.log(e);
  }

  // unencode file contents into human readable
  let file = Buffer.from(existingFile.content, "base64").toString("utf-8");

  // awkwardly append yaml lol
  const updatedComment = `${file}
- name: ${commenter}
  date: ${new Date().toLocaleDateString()}
  color: ${color}
  comment: |
    ${comment}
  `;

  const updatedCommentEncoded = Buffer.from(updatedComment, "utf-8").toString(
    "base64"
  );

  const branchName = `comment-${Date.now()}`;

  // get latest commit to make branch
  const commits = await fetch(`${commitsEndpoint}?per_page=1`, {
    method: "GET",
    headers,
  }).then((res) => res.json());

  // create new reference aka branch
  const branch = await fetch(referenceEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      accept: "application/vnd.github.v3+json",
      sha: commits[0].sha,
      ref: `refs/heads/${branchName}`,
    }),
  }).then((res) => res.text());

  const pullTitle = `Comment by ${commenter} on ${new Date().toLocaleString()}`;

  // Use the Contents API to create a commit on new branch
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
  }).then((res) => res.text());

  const pullMessage = `Hi ${commenter}!

Thanks for writing a comment. It will appear on the site a minute after it is approved.

If you have a github account you can get notified when your comment is merged by clicking "Subscribe" on the right.

Have a nice day \\o/`;

  // Open pull request with new branch
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

  res.writeHead(302, { location: pull.html_url });
  res.end();
};

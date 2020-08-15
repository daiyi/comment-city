const fetch = require("node-fetch");

module.exports = async (req, res) => {
  const { body } = req;
  const { name: commenter, date, color, comment, path } = body;
  console.log("[");

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
    console.log("$existingFile: ", existingFile);
  } catch (e) {
    console.log("$ERROR!!!", e);
  }

  // unencode file contents into human readable
  let file = Buffer.from(existingFile.content, "base64").toString("utf-8");

  // awkwardly append yaml lol
  const updatedComment = `${file}
- name: ${commenter}
  date: ${new Date.toLocaleDateString()}
  color: ${color}
  comment: |
    ${comment}
  `;
  console.log("$updatedComment: ", updatedComment);

  const updatedCommentEncoded = Buffer.from(updatedComment, "utf-8").toString(
    "base64"
  );

  // TODO
  const branchName = `comment-${Date.now()}`;
  // const branchName = "potato";

  // get latest commit to make branch
  const commits = await fetch(`${commitsEndpoint}?per_page=1`, {
    method: "GET",
    headers,
  }).then((res) => res.json());
  console.log("$commits: ", commits);

  // create new reference aka branch
  const branch = await fetch(referenceEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      accept: "application/vnd.github.v3+json",
      sha: commits[0].sha, // TODO
      ref: `refs/heads/${branchName}`,
    }),
  }).then((res) => res.text());
  console.log("$branch: ", branch);

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
      branch: branchName, // TODO use from branch
    }),
  }).then((res) => res.text());
  console.log("$commit: ", commit);

  // Open pull request with new branch
  const pull = await fetch(pullsEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      accept: "application/vnd.github.v3+json",
      title: pullTitle,
      head: branchName,
      base: "master",
      body: `${commenter} would like to add a comment to ${path}: 
${comment}`,
      maintainer_can_modify: true,
    }),
  }).then((res) => res.text());
  console.log("$pull: ", pull);

  console.log("]");
  res.send("done");
};

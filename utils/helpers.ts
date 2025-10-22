export const handleFetchCommits = async (
  repoName: string,
  sinceISO: string,
  accessToken: string
) => {
  try {
    const res = await fetch("/api/fetch-commits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fullRepoName: repoName,
        sinceISO,
      }),
    });

    const data = await res.json();
    data.repoName = repoName;
    return data;
  } catch (err) {
    console.log("Error: ", err);
  }
};

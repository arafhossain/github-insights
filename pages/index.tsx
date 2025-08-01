import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const sessionHook = useSession();
  const session = sessionHook?.data;

  const handleFetchCommits = async () => {
    const res = await fetch("/api/fetch-commits", {
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
    });

    const data = await res.json();

    console.log("Data: ", data);
  };

  return (
    <main>
      {!session ? (
        <button
          onClick={() => {
            signIn("github");
          }}
        >
          Login with Github
        </button>
      ) : (
        <>
          <p>Signed in as {session.user?.email}</p>
          <div>
            <button
              onClick={() => {
                handleFetchCommits();
              }}
            >
              Fetch commits
            </button>
          </div>
          <div>
            <button
              onClick={() => {
                signOut();
              }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </main>
  );
}

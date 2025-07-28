import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const sessionHook = useSession();
  const session = sessionHook?.data;

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
          <button
            onClick={() => {
              signOut();
            }}
          >
            Sign out
          </button>
        </>
      )}
    </main>
  );
}

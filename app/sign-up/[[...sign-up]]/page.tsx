import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <SignUp />
      </div>
    </main>
  );
}
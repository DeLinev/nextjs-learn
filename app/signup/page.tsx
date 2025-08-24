import { Suspense } from "react";
import AcmeLogo from "../ui/acme-logo";
import SignUpForm from "../ui/signup-form";
import { AuthFormsSkeleton } from "../ui/skeletons";

export default async function SignUp() {
    return (
        <main className="flex items-center justify-center md:h-screen">
          <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
              <div className="flex h-20 w-full items-end rounded-lg bg-blue-500 p-3 md:h-36">
                  <div className="w-32 text-white md:w-36">
                      <AcmeLogo />
                  </div>
              </div>
              <Suspense fallback={<AuthFormsSkeleton />}>
                  <SignUpForm />
              </Suspense>
          </div>
        </main>
    )
}
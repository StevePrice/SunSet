import { withAuth } from "@/lib/auth";

function handle(request: Request) {
  return withAuth((auth) => auth.handler(request));
}

export { handle as GET, handle as POST };

import { corsHeaders, errJSON, okJSON, requireAuth } from "../_utils";

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
};

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const role = requireAuth(request, env as any); // "owner" | "admin"
    return okJSON({ ok: true, role }, { headers: corsHeaders(request.headers.get("origin") ?? undefined) });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return errJSON(401, "unauthorized");
  }
};



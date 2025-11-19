import { WORKFLOW_ID } from "@/lib/config";

export const runtime = "edge";

interface CreateSessionRequestBody {
  message?: string;
}

const DEFAULT_CHATKIT_BASE = "https://api.openai.com";

export async function POST(request: Request) {
  const body = (await request.json()) as CreateSessionRequestBody;

  const userMessage = body.message ?? null;

  try {
    const response = await fetch(`${DEFAULT_CHATKIT_BASE}/v1/chatkit/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY!}`,
        "OpenAI-Beta": "chatkit_beta=v1"
      },
      body: JSON.stringify({
        workflow: {
          id: WORKFLOW_ID,
          version: Number(process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_VERSION) || undefined,
        },

        // Match Agent Builder behavior:
        input: {
          messages: userMessage
            ? [
                {
                  role: "user",
                  content: userMessage,
                },
              ]
            : [],

          metadata: {
            source: "human",
            conversation_mode: "human",
          },

          state: {},
        },

        // Required user string (not object)
        user: "user_" + Math.random().toString(36).slice(2),

        chatkit_configuration: {
          file_upload: {
            enabled: true,
          },
        },
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", json);
      return new Response(JSON.stringify(json), { status: 500 });
    }

    return Response.json(json);
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error:
          typeof error === "object" && error !== null && "message" in error
            ? (error as any).message
            : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

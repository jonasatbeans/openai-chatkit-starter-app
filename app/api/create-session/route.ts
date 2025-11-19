import { WORKFLOW_ID } from "@/lib/config";

export const runtime = "edge";

interface CreateSessionRequestBody {
  message?: string;
}

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

const DEFAULT_CHATKIT_BASE = "https://api.openai.com";

export async function POST(request: Request) {
  let userMessage: string | null = null;

  try {
    const body = (await request.json()) as CreateSessionRequestBody;
    userMessage = body.message ?? null;
  } catch {
    // No message included; we allow session creation without initial user text
    userMessage = null;
  }

  try {
    const workflowVersion =
      process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_VERSION !== undefined
        ? Number(process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_VERSION)
        : undefined;

    const response = await fetch(`${DEFAULT_CHATKIT_BASE}/v1/chatkit/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
        "OpenAI-Beta": "chatkit_beta=v1",
      },
      body: JSON.stringify({
        workflow: {
          id: WORKFLOW_ID,
          version: workflowVersion,
        },

        // Match Agent Builder input envelope
        input: {
          messages:
            userMessage !== null
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

        // ChatKit requirement: user MUST be a string
        user: "user_" + Math.random().toString(36).slice(2),

        chatkit_configuration: {
          file_upload: { enabled: true },
        },
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", json);
      return new Response(JSON.stringify(json), { status: 500 });
    }

    return Response.json(json);
  } catch (error: unknown) {
    const message = isErrorWithMessage(error)
      ? error.message
      : "Unknown error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
    });
  }
}

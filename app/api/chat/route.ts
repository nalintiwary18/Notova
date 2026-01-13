import { ChatGroq } from "@langchain/groq";

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-20b",
  temperature: 0.7,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response("Bad Request: messages array required", { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of await llm.stream(messages)) {
            const content =
              typeof chunk.content === "string"
                ? chunk.content
                : chunk.content
                    .map((block: any) => (typeof block === "string" ? block : block.text || ""))
                    .join("");

            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return new Response("Invalid request body", { status: 400 });
  }
}
// app/api/docrender/route.ts
import { ChatGroq } from "@langchain/groq";
import { NextResponse } from "next/server";
import { BaseMessage } from "@langchain/core/messages";

const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-20b",
    temperature: 0.7,
});

export async function POST(request: Request) {
    try {
        const { selectedText, command } = await request.json();

        if (!selectedText || !command) {
            return NextResponse.json(
                { error: "Missing selectedText or command" },
                { status: 400 }
            );
        }

        // Create the prompt for AI editing
        const prompt = `Selected text: "${selectedText}"

User instruction: ${command}

Return ONLY the edited text with no explanation, quotes, or markdown. Just the raw edited text that will replace the selection.`;

        // Invoke the LLM
        const response = await llm.invoke(prompt);

        // Extract the edited text from the response
        const editedText = typeof response.content === 'string'
            ? response.content.trim()
            : '';

        return NextResponse.json({
            editedText,
            success: true
        });

    } catch (error) {
        console.error("Error processing AI edit:", error);
        return NextResponse.json(
            { error: "Failed to process AI command" },
            { status: 500 }
        );
    }
}
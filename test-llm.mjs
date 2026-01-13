import { invokeLLM } from "./server/_core/llm.ts";

async function testLLM() {
  console.log("Testing Manus LLM...");
  
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say 'Hello World' in one sentence." },
      ],
    });
    
    console.log("✅ LLM test successful!");
    console.log("Response:", response.choices[0]?.message?.content);
  } catch (error) {
    console.error("❌ LLM test failed!");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testLLM();

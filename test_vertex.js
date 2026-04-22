const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

async function test() {
  try {
    const credsPath = 'C:\\Users\\Admin\\Downloads\\project-99965e68-3f47-476b-adc-524fb419f7b5.json';
    const jsonStr = fs.readFileSync(credsPath, 'utf8');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
    
    const parsed = JSON.parse(jsonStr);
    
    const ai = new GoogleGenAI({
      vertexai: {
        project: parsed.project_id,
        location: 'us-central1'
      }
    });

    console.log("Testing with gemini-2.5-flash...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: ["Xin chào"]
    });
    console.log("Success:", response.text);

  } catch (e) {
    console.error("ERROR 2.5:", e.message);
  }

  try {
    const credsPath = 'C:\\Users\\Admin\\Downloads\\project-99965e68-3f47-476b-adc-524fb419f7b5.json';
    const jsonStr = fs.readFileSync(credsPath, 'utf8');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
    
    const parsed = JSON.parse(jsonStr);
    
    const ai = new GoogleGenAI({
      vertexai: {
        project: parsed.project_id,
        location: 'us-central1'
      }
    });

    console.log("Testing with gemini-1.5-flash...");
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: ["Xin chào"]
    });
    console.log("Success:", response.text);

  } catch (e) {
    console.error("ERROR 1.5:", e.message);
  }
}
test();

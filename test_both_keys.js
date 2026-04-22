const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

async function testFile(filePath) {
  try {
    console.log("\n--- Testing:", filePath, "---");
    const jsonStr = fs.readFileSync(filePath, 'utf8');
    const creds = JSON.parse(jsonStr);
    console.log("Key ID:", creds.private_key_id);
    console.log("Email:", creds.client_email);
    console.log("Project:", creds.project_id);
    
    // check key format
    const keyLines = creds.private_key.split('\n');
    console.log("Key lines:", keyLines.length, "| Starts with BEGIN:", creds.private_key.includes('-----BEGIN PRIVATE KEY-----'));

    const auth = new GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    console.log("Token OK:", tokenResponse.token ? "YES" : "NO");
    
    // Test Vertex AI call
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${creds.project_id}/locations/us-central1/publishers/google/models/gemini-1.5-flash:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenResponse.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Hello" }] }] })
    });
    const result = await res.json();
    
    if (result.error) {
      console.error("API Error:", result.error.code, result.error.message);
    } else {
      console.log("SUCCESS:", result.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100));
    }
  } catch (e) {
    console.error("FAILED:", e.message);
  }
}

async function main() {
  await testFile('C:\\Users\\Admin\\Downloads\\project-99965e68-3f47-476b-adc-524fb419f7b5.json');
  await testFile('C:\\Users\\Admin\\Downloads\\project-99965e68-3f47-476b-adc-efe715c530b7.json');
}
main();

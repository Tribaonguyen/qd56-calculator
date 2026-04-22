const { GoogleAuth } = require('google-auth-library');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const os = require('os');
const path = require('path');

async function test() {
  try {
    // Đọc file credentials
    const credsPath = 'C:\\Users\\Admin\\Downloads\\project-99965e68-3f47-476b-adc-524fb419f7b5.json';
    const jsonStr = fs.readFileSync(credsPath, 'utf8');
    const creds = JSON.parse(jsonStr);
    
    console.log("Project:", creds.project_id);
    console.log("Client email:", creds.client_email);

    // Lấy access token bằng google-auth-library
    const auth = new GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;
    console.log("Access token obtained:", accessToken ? "YES (length:" + accessToken.length + ")" : "NO");

    // Gọi Gemini thông qua Vertex AI endpoint trực tiếp 
    const projectId = creds.project_id;
    const location = 'us-central1';
    const model = 'gemini-2.5-pro';
    
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
    
    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Xin chào, bạn có thể tư vấn xây dựng không?" }] }]
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body
    });

    const result = await response.json();
    
    if (result.error) {
      console.error("API Error:", JSON.stringify(result.error, null, 2));
    } else {
      console.log("SUCCESS! Response:", result.candidates?.[0]?.content?.parts?.[0]?.text);
    }
    
  } catch (e) {
    console.error("Test Failed:", e.message);
    console.error(e.stack);
  }
}

test();

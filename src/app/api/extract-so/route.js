import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') || 'ocr'; // 'ocr' hoặc 'manual'
    const files = formData.getAll('files');

    if (action === 'ocr' && (!files || files.length === 0)) {
      return NextResponse.json(
        { error: 'Không tìm thấy file ảnh nào được tải lên.' },
        { status: 400 }
      );
    }

    const apiType = formData.get('apiType');
    
    let aiConfig = {};

    if (apiType === 'aistudio') {
      const clientKey = formData.get('apiKey');
      const finalKey = clientKey || process.env.GEMINI_API_KEY;
      if (!finalKey) {
        return NextResponse.json(
          { error: 'Chưa cung cấp GEMINI_API_KEY. Vui lòng nhập trên màn hình hoặc thêm biến môi trường.' },
          { status: 500 }
        );
      }
      aiConfig = { apiKey: finalKey };
    } else if (apiType === 'vertex') {
      const vertexJsonString = formData.get('vertexJson');
      const location = formData.get('vertexLocation') || 'us-central1';
      if (!vertexJsonString) {
        return NextResponse.json(
          { error: 'Vertex AI yêu cầu phải paste nội dung file JSON Service Account.' },
          { status: 400 }
        );
      }
      
      let project = '';
      try {
        const creds = JSON.parse(vertexJsonString);
        project = creds.project_id;
        if (!project) throw new Error("JSON thiếu trường project_id");

        // Fix: Khôi phục ký tự xuống dòng trong private_key bị hỏng khi qua localStorage/FormData
        if (creds.private_key) {
          creds.private_key = creds.private_key
            .replace(/\\n/g, '\n')       // chuyển ký tự escaped \n thành dòng thật
            .replace(/\r\n/g, '\n');     // chuẩn hóa CRLF → LF (Windows)
        }
        
        const tmpPath = path.join(os.tmpdir(), 'qd56-tmp-vertex.json');
        fs.writeFileSync(tmpPath, JSON.stringify(creds)); // ghi lại JSON đã chuẩn hóa
        process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
      } catch (err) {
        console.error('Lỗi khi cấu hình Vertex:', err);
        return NextResponse.json({ error: 'Lỗi nạp thư viện hoặc JSON không hợp lệ!' }, { status: 400 });
      }

      // Xóa GEMINI_API_KEY khỏi env tạm thời để tránh GenAI fallback nhầm sang API Key cho Vertex
      const backupKey = process.env.GEMINI_API_KEY;
      if (backupKey) delete process.env.GEMINI_API_KEY;

      aiConfig = {
        project: project,
        location: location,
        vertexai: { project, location }
      };
      
      // Init AI then restore
      var ai = new GoogleGenAI(aiConfig);
      if (backupKey) process.env.GEMINI_API_KEY = backupKey;

    } else {
      return NextResponse.json({ error: 'Loại API không hợp lệ.' }, { status: 400 });
    }

    // Nếu không phải vertex thì khởi tạo bình thường
    if (apiType === 'aistudio') {
      var ai = new GoogleGenAI(aiConfig);
    }

    let contentsArray = [];

    if (action === 'manual') {
      const manualDataStr = formData.get('manualData');
      const manualParams = JSON.parse(manualDataStr);
      let referenceText = '';
      try {
        const contextPath = path.join(process.cwd(), 'src/app/api/extract-so/qdd56-context.txt');
        referenceText = fs.readFileSync(contextPath, 'utf8');
      } catch (e) {
        console.warn("Không đọc được qdd56-context.txt, AI sẽ dùng kiến thức tự có.");
      }
      
      const prompt = `Bạn là chuyên gia thẩm định Quy hoạch Xây dựng Dân dụng.
Dưới đây là nội dung toàn văn Quyết định 56/2021/QĐ-UBND TP.HCM làm căn cứ cực kỳ quan trọng:
---
${referenceText}
---
KHÁCH HÀNG YÊU CẦU TƯ VẤN NHƯ SAU:
- Vị trí mảnh đất: ${manualParams.location}
- Diện tích thổ cư cần đối chiếu: ${manualParams.residentialArea} m2
- Diện tích khác: ${manualParams.otherArea} m2 (Nội dung: ${manualParams.otherAreaNote})
- Lộ giới đường/hẻm: ${manualParams.roadWidth} m
- Hình dạng/toạ độ lô đất: ${manualParams.shapeCoords}
- Yêu cầu khác: ${manualParams.extraNotes}

Hãy phân tích quy mô xây dựng TỐI ĐA đối với phần "Diện tích thổ cư" dựa vào lộ giới, so sánh với Bảng quy định Mật độ, Khoảng lùi, Số tầng cao trong QĐ 56. Tuyệt đối không tự bịa ra thông số ngoài văn bản (chỉ lấy số cao nhất cho phép trong quy định tại mục đó). 

Xuất kết quả dưới định dạng JSON đúng chuẩn sau:
{
  "area": <số_thực_tổng_diện_tích_thổ_cư>,
  "density": <số_thực_mật_độ_xây_dựng_tối_đa_phần_trăm>,
  "maxFloors": <số_nguyên_tầng_tối_đa_chưa_bao_gồm_lửng_mái_sân_thượng>,
  "rearSetback": <số_thực_khoảng_lùi_sau_mét_nếu_có_quy_định_theo_diện_tích>,
  "aiNote": "<Đoạn văn từ 5-7 câu tư vấn cực kỳ chi tiết: Phân tích vì sao có các chỉ tiêu (số tầng, lùi). Đặc biệt đánh giá rủi ro/lợi thế về 'Hình dạng lô đất' và 'Diện tích khác' mà khách nhập, và giải đáp 'Yêu cầu khác' nếu có.>"
}`;
      contentsArray = [prompt];

    } else {
      // Chuyển toàn bộ files sang định dạng inlineData mà API Gemini cần
      const contents = files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return {
          inlineData: {
            data: Buffer.from(arrayBuffer).toString('base64'),
            mimeType: file.type
          }
        };
      });

      const inlineDataParts = await Promise.all(contents);

      const prompt = `Bạn là một chuyên gia về quy hoạch và đo đạc địa chính tại Việt Nam.
Tôi sẽ cung cấp cho bạn các ảnh chụp của một hoặc nhiều mặt Sổ Hồng (Giấy chứng nhận quyền sử dụng đất), bao gồm phần thông tin chữ nhật và phần hình vẽ hoạ đồ toạ độ.

Nhiệm vụ của bạn:
1. Đọc số liệu chiều ngang (width), chiều sâu (depth) của mảnh đất (đơn vị mét). Nếu lô đất có hình dáng móp méo, góc cạnh không vuông vức, hãy tính toán và đưa ra con số kích thước đại diện hợp lý (vd lấy trung bình hoặc chọn cạnh chính).
2. Đọc lộ giới đường tiếp giáp mặt tiền chạy qua (roadWidth, đơn vị mét). Nếu hoàn toàn không có lộ giới ghi trên sổ, trả về 0.
3. Tính toán hoặc đọc chính xác đoạn ghi nhận diện tích tổng (area, m2). ĐẶC BIỆT LƯU Ý: Chú ý thật kỹ các dấu chấm/phẩy thập phân bị mờ trên ảnh (ví dụ 33.5m2 rất dễ đọc nhầm thành 335m2). Hãy tự đối chiếu phép nhân (width x depth) để xác nhận diện tích thực tế.
4. Quan sát hình thù thực tế trên bản vẽ và diện tích, đưa ra một nhận định phụ (aiNote) dài từ 2 đến 4 câu theo định dạng: "Dựa trên hình thù của mảnh đất thực tế, nhà của bạn có thể xây...". Nhận xét cụ thể về dáng đất (nghiêng, tóp hậu, nở hậu, góc nhọn...) sẽ ảnh hưởng ra sao đến khả năng bố trí và thiết kế không gian sử dụng.

Yêu cầu xuất đầu ra CHỈ là định dạng JSON đúng theo chuẩn sau, không bọc trong \`\`\`json hay có bất kỳ text nào khác:
{
  "width": <số_thực_khoảng_ngang>,
  "depth": <số_thực_khoảng_sâu>,
  "roadWidth": <số_thực_lộ_giới>,
  "area": <số_thực_tổng_diện_tích>,
  "aiNote": "<nhận_định_của_AI>"
}`;
      contentsArray = [prompt, ...inlineDataParts];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: contentsArray,
      config: {
        responseMimeType: "application/json",
        temperature: 0,
      }
    });

    const jsonText = response.text;
    const extractedData = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      message: 'Trích xuất và tư vấn thành công.',
      data: extractedData,
    });

  } catch (error) {
    console.error('Lỗi khi gọi API AI:', error);
    let errMsg = error.message || 'Lỗi không xác định.';
    
    if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
       errMsg = "Hệ thống máy chủ AI của Google hiện đang quá tải (Tắc nghẽn mạng). Vui lòng chờ vài giây rồi bấm thử lại!";
    } else if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
       errMsg = "Tài khoản của bạn đã vượt quá hạn mức sử dụng (Quota) của Google. Vui lòng thêm thẻ hoặc nâng cấp gói API.";
    } else {
       errMsg = "Lỗi nền tảng: " + errMsg;
    }

    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
